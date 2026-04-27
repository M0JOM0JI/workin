import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoClockOutMode } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AutoClockoutService {
  private readonly logger = new Logger(AutoClockoutService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoClockOut() {
    const stores = await this.prisma.store.findMany({
      where: { autoClockOut: true },
    });

    for (const store of stores) {
      try {
        await this.processStore(store);
      } catch (e) {
        this.logger.error(`자동퇴근 처리 실패 storeId=${store.id}`, e);
      }
    }
  }

  private async processStore(store: {
    id: string;
    autoClockOutMode: AutoClockOutMode;
    autoClockOutBuffer: number;
    autoClockOutMaxHours: number;
  }) {
    const openAttendances = await this.prisma.attendance.findMany({
      where: { storeId: store.id, clockOut: null },
      include: { schedule: true },
    });

    const now = new Date();

    for (const att of openAttendances) {
      let shouldClockOut = false;
      let clockOutTime = now;

      if (store.autoClockOutMode === AutoClockOutMode.MIDNIGHT) {
        // 자정 처리: Cron이 자정 직후에 실행되면 전날 미퇴근 처리
        const clockInKST = new Date(att.clockIn.getTime() + 9 * 60 * 60 * 1000);
        const nowKST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        if (clockInKST.getUTCDate() !== nowKST.getUTCDate()) {
          shouldClockOut = true;
          // 자정(KST) = UTC 15:00
          const midnight = new Date(clockInKST);
          midnight.setUTCDate(midnight.getUTCDate() + 1);
          midnight.setUTCHours(15, 0, 0, 0); // KST 00:00 = UTC 15:00
          clockOutTime = midnight;
        }
      } else if (store.autoClockOutMode === AutoClockOutMode.MAX_HOURS) {
        const elapsedMs = now.getTime() - att.clockIn.getTime();
        const maxMs = store.autoClockOutMaxHours * 60 * 60 * 1000;
        if (elapsedMs >= maxMs) {
          shouldClockOut = true;
          clockOutTime = new Date(att.clockIn.getTime() + maxMs);
        }
      } else if (store.autoClockOutMode === AutoClockOutMode.SCHEDULE) {
        if (att.schedule) {
          const bufferMs = store.autoClockOutBuffer * 60 * 1000;
          const deadline = new Date(att.schedule.endAt.getTime() + bufferMs);
          if (now >= deadline) {
            shouldClockOut = true;
            clockOutTime = deadline;
          }
        }
      }

      if (shouldClockOut) {
        await this.prisma.attendance.update({
          where: { id: att.id },
          data: { clockOut: clockOutTime, isAutoClockOut: true },
        });
        this.logger.log(`자동퇴근 처리: attendanceId=${att.id} storeId=${store.id} mode=${store.autoClockOutMode}`);
      }
    }
  }
}
