import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CopyWeekDto } from './dto/copy-week.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  async findAll(storeId: string, userId: string, from: string, to: string) {
    await this.storesService.assertMember(storeId, userId);
    return this.prisma.schedule.findMany({
      where: {
        storeId,
        startAt: { gte: new Date(from) },
        endAt:   { lte: new Date(to) },
      },
      include: { staff: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(storeId: string, userId: string, dto: CreateScheduleDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.schedule.create({
      data: { storeId, ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) },
    });
  }

  async update(storeId: string, id: string, userId: string, dto: UpdateScheduleDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt   && { endAt:   new Date(dto.endAt)   }),
      },
    });
  }

  async confirm(storeId: string, id: string, userId: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    const schedule = await this.prisma.schedule.findFirst({ where: { id, storeId } });
    if (!schedule) throw new NotFoundException('스케줄을 찾을 수 없습니다.');
    return this.prisma.schedule.update({
      where: { id },
      data: { isConfirmed: !schedule.isConfirmed }, // 토글
      include: { staff: { include: { user: { select: { id: true, name: true } } } } },
    });
  }

  async copyWeek(storeId: string, userId: string, dto: CopyWeekDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    // 복사 원본 주: fromDate(월) ~ +6일(일)
    const from = new Date(dto.fromDate);
    const to   = new Date(dto.fromDate);
    to.setDate(to.getDate() + 7); // +7일(익주 월요일 0시) exclusive

    const sourceSchedules = await this.prisma.schedule.findMany({
      where: { storeId, startAt: { gte: from, lt: to } },
    });

    if (sourceSchedules.length === 0) {
      return { copied: 0, message: '복사할 스케줄이 없습니다.' };
    }

    // 7일 더한 새 스케줄 일괄 생성
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    await this.prisma.schedule.createMany({
      data: sourceSchedules.map((s) => ({
        storeId,
        staffId:     s.staffId,
        startAt:     new Date(s.startAt.getTime() + ONE_WEEK_MS),
        endAt:       new Date(s.endAt.getTime()   + ONE_WEEK_MS),
        memo:        s.memo,
        isRecurring: s.isRecurring,
        repeatRule:  s.repeatRule,
        // isConfirmed 는 false로 초기화 (새 주는 미확정)
      })),
    });

    return { copied: sourceSchedules.length, message: `${sourceSchedules.length}개 시프트가 다음 주로 복사되었습니다.` };
  }

  async remove(storeId: string, id: string, userId: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: '스케줄이 삭제되었습니다.' };
  }
}
