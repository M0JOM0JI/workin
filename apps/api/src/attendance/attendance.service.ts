import { Injectable, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  async findAll(storeId: string, userId: string, date?: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    const where: any = { storeId };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.clockIn = { gte: start, lt: end };
    }
    return this.prisma.attendance.findMany({
      where,
      include: { staff: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { clockIn: 'desc' },
    });
  }

  async clockIn(storeId: string, userId: string, scheduleId?: string) {
    const staff = await this.storesService.assertMember(storeId, userId);

    // 이미 출근 중인지 확인
    const existing = await this.prisma.attendance.findFirst({
      where: { storeId, staffId: staff.id, clockOut: null },
    });
    if (existing) throw new BadRequestException('이미 출근 중입니다.');

    return this.prisma.attendance.create({
      data: { storeId, staffId: staff.id, scheduleId, clockIn: new Date() },
    });
  }

  async clockOut(storeId: string, userId: string) {
    const staff = await this.storesService.assertMember(storeId, userId);

    const attendance = await this.prisma.attendance.findFirst({
      where: { storeId, staffId: staff.id, clockOut: null },
    });
    if (!attendance) throw new BadRequestException('출근 기록이 없습니다.');

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: new Date() },
    });
  }

  async updateAttendance(storeId: string, userId: string, attendanceId: string, dto: UpdateAttendanceDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.attendance.update({
      where: { id: attendanceId, storeId },
      data: {
        ...(dto.clockIn  !== undefined && { clockIn:  new Date(dto.clockIn) }),
        ...(dto.clockOut !== undefined && { clockOut: dto.clockOut ? new Date(dto.clockOut) : null }),
      },
      include: {
        staff: { include: { user: { select: { id: true, name: true } } } },
        schedule: { select: { id: true, startAt: true, endAt: true } },
      },
    });
  }

  async findByUser(userId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const staffRecords = await this.prisma.storeStaff.findMany({ where: { userId } });
    const staffIds = staffRecords.map((s) => s.id);

    return this.prisma.attendance.findMany({
      where: { staffId: { in: staffIds }, clockIn: { gte: from, lt: to } },
      include: { store: { select: { id: true, name: true } } },
      orderBy: { clockIn: 'desc' },
    });
  }
}
