import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';

const LATE_GRACE_MS = 5 * 60 * 1000; // 5분 유예

@Injectable()
export class StatisticsService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  /**
   * 직원별 월간 통계
   * - 근무일수 (clockOut 있는 attendance 수)
   * - 총 근무시간(분)
   * - 지각 횟수 (scheduleId 있는 attendance 중 clockIn > schedule.startAt + 5분)
   * - 결근 횟수 (스케줄 있었으나 attendance 없는 건)
   */
  async getStaffsStatistics(storeId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    const [year, month] = yearMonth.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 1);

    // 현재 재직 중인 직원 목록
    const staffList = await this.prisma.storeStaff.findMany({
      where: { storeId, role: Role.STAFF },
      include: { user: { select: { id: true, name: true } } },
    });

    const items = await Promise.all(
      staffList.map(async (staff) => {
        // 해당 월 출퇴근 기록 (schedule 포함)
        const attendances = await this.prisma.attendance.findMany({
          where: { staffId: staff.id, clockIn: { gte: from, lt: to } },
          include: { schedule: { select: { startAt: true, endAt: true } } },
        });

        // 해당 월 스케줄 전체 (결근 판별용)
        const schedules = await this.prisma.schedule.findMany({
          where: {
            staffId: staff.id,
            storeId,
            startAt: { gte: from, lt: to },
          },
          include: { attendance: { select: { id: true } } },
        });

        // 근무일수 (clockOut 있는 attendance)
        const workDays = attendances.filter((a) => !!a.clockOut).length;

        // 총 근무시간(분)
        const totalMinutes = attendances.reduce((acc, a) => {
          if (!a.clockOut) return acc;
          return acc + Math.floor((a.clockOut.getTime() - a.clockIn.getTime()) / 60000);
        }, 0);

        // 지각 횟수: scheduleId 있는 attendance에서 clockIn이 schedule.startAt + 5분 초과
        const lateCount = attendances.filter((a) => {
          if (!a.schedule) return false;
          return a.clockIn.getTime() > a.schedule.startAt.getTime() + LATE_GRACE_MS;
        }).length;

        // 결근 횟수: 스케줄이 있지만 attendance가 없는 건 (과거 날짜만)
        const now = new Date();
        const absentCount = schedules.filter((s) => {
          return !s.attendance && s.startAt < now;
        }).length;

        // 평균 근무시간(분/일)
        const avgMinutes = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;

        return {
          staffId:    staff.id,
          name:       staff.user.name,
          workDays,
          totalMinutes,
          avgMinutes,
          lateCount,
          absentCount,
        };
      }),
    );

    return {
      yearMonth,
      staffCount: items.length,
      items,
    };
  }

  /**
   * 매장 월간 요약 통계 (OWNER 전용)
   * - 전 매장 총 출근인원, 총 근무시간, 총 급여 예정액
   */
  async getStoreSummary(userId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 1);

    // 해당 유저가 OWNER인 매장 목록
    const ownedStores = await this.prisma.storeStaff.findMany({
      where: { userId, role: Role.OWNER, leftAt: null },
      include: { store: { select: { id: true, name: true } } },
    });

    const storeStats = await Promise.all(
      ownedStores.map(async ({ store }) => {
        // 해당 매장 직원 수
        const staffCount = await this.prisma.storeStaff.count({
          where: { storeId: store.id, role: Role.STAFF, leftAt: null },
        });

        // 해당 월 출퇴근 집계
        const attendances = await this.prisma.attendance.findMany({
          where: { storeId: store.id, clockIn: { gte: from, lt: to }, clockOut: { not: null } },
        });
        const totalMinutes = attendances.reduce((acc, a) => {
          if (!a.clockOut) return acc;
          return acc + Math.floor((a.clockOut.getTime() - a.clockIn.getTime()) / 60000);
        }, 0);

        // 출근 인원 수 (유니크 staffId)
        const activeStaffs = new Set(attendances.map((a) => a.staffId)).size;

        return {
          storeId:    store.id,
          storeName:  store.name,
          staffCount,
          activeStaffs,
          totalMinutes,
        };
      }),
    );

    return {
      yearMonth,
      stores: storeStats,
      totalStores:   ownedStores.length,
      totalMinutes:  storeStats.reduce((s, i) => s + i.totalMinutes, 0),
      totalActiveStaffs: storeStats.reduce((s, i) => s + i.activeStaffs, 0),
    };
  }
}
