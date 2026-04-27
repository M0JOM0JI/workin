import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, RequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateAttendanceRequestDto } from './dto/create-attendance-request.dto';
import { ReviewAttendanceRequestDto } from './dto/review-attendance-request.dto';

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

  // ── AttendanceRequest ──────────────────────────────────────────────────────

  async createRequest(storeId: string, userId: string, dto: CreateAttendanceRequestDto) {
    const requester = await this.storesService.assertMember(storeId, userId);

    // 요청 대상 직원 결정
    // OWNER/MANAGER가 staffId를 명시하면 해당 직원 대상, 아니면 본인
    let targetStaffId = requester.id;
    if (dto.staffId && dto.staffId !== requester.id) {
      if (requester.role === Role.STAFF) {
        throw new ForbiddenException('본인 요청만 가능합니다.');
      }
      // 대상 직원이 해당 매장 멤버인지 확인
      const targetStaff = await this.prisma.storeStaff.findFirst({
        where: { id: dto.staffId, storeId },
      });
      if (!targetStaff) throw new NotFoundException('해당 직원을 찾을 수 없습니다.');
      targetStaffId = dto.staffId;
    }

    const isManager = requester.role === Role.OWNER || requester.role === Role.MANAGER;
    const status: RequestStatus = isManager ? RequestStatus.APPROVED : RequestStatus.PENDING;

    const request = await this.prisma.attendanceRequest.create({
      data: {
        storeId,
        staffId: targetStaffId,
        requestedById: userId,
        attendanceId: dto.attendanceId ?? null,
        requestedClockIn: new Date(dto.requestedClockIn),
        requestedClockOut: dto.requestedClockOut ? new Date(dto.requestedClockOut) : null,
        reason: dto.reason,
        status,
        ...(isManager && {
          reviewedById: userId,
          reviewedAt: new Date(),
          reviewNote: '관리자 직접 처리',
        }),
      },
    });

    // OWNER/MANAGER는 즉시 출퇴근 반영
    if (isManager) {
      await this.applyRequest(request);
    }

    return request;
  }

  async findRequests(storeId: string, userId: string, status?: RequestStatus) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.attendanceRequest.findMany({
      where: { storeId, ...(status && { status }) },
      include: {
        staff: { include: { user: { select: { id: true, name: true } } } },
        requestedBy: { select: { id: true, name: true } },
        attendance: { select: { id: true, clockIn: true, clockOut: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyRequests(userId: string) {
    const staffRecords = await this.prisma.storeStaff.findMany({ where: { userId } });
    const staffIds = staffRecords.map((s) => s.id);

    return this.prisma.attendanceRequest.findMany({
      where: { staffId: { in: staffIds } },
      include: {
        store: { select: { id: true, name: true } },
        attendance: { select: { id: true, clockIn: true, clockOut: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewRequest(storeId: string, userId: string, requestId: string, dto: ReviewAttendanceRequestDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    const request = await this.prisma.attendanceRequest.findFirst({
      where: { id: requestId, storeId },
    });
    if (!request) throw new NotFoundException('요청을 찾을 수 없습니다.');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('이미 처리된 요청입니다.');
    }

    const updated = await this.prisma.attendanceRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote ?? null,
      },
    });

    if (dto.status === 'APPROVED') {
      await this.applyRequest(updated);
    }

    return updated;
  }

  // 승인된 요청을 실제 출퇴근 레코드에 반영
  private async applyRequest(request: {
    attendanceId: string | null;
    staffId: string;
    storeId: string;
    requestedClockIn: Date;
    requestedClockOut: Date | null;
  }) {
    if (request.attendanceId) {
      // 기존 기록 수정
      await this.prisma.attendance.update({
        where: { id: request.attendanceId },
        data: {
          clockIn: request.requestedClockIn,
          clockOut: request.requestedClockOut,
        },
      });
    } else {
      // 신규 기록 생성
      await this.prisma.attendance.create({
        data: {
          storeId: request.storeId,
          staffId: request.staffId,
          clockIn: request.requestedClockIn,
          clockOut: request.requestedClockOut,
        },
      });
    }
  }
}
