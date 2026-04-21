import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  async getStoreSummary(storeId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    const staffList = await this.prisma.storeStaff.findMany({
      where: { storeId, leftAt: null, role: Role.STAFF },
      include: { user: { select: { id: true, name: true } } },
    });

    const results = await Promise.all(
      staffList.map((staff) => this.calcPayroll(staff.id, staff.hourlyWage, yearMonth)),
    );

    return staffList.map((staff, i) => ({
      staffId: staff.id,
      name: staff.user.name,
      hourlyWage: staff.hourlyWage,
      ...results[i],
    }));
  }

  async getStaffPayroll(storeId: string, staffId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    const staff = await this.prisma.storeStaff.findUniqueOrThrow({
      where: { id: staffId },
      include: { user: { select: { id: true, name: true } } },
    });

    const payroll = await this.calcPayroll(staffId, staff.hourlyWage, yearMonth);
    const attendances = await this.getMonthAttendances(staffId, yearMonth);

    return { staff: { id: staff.id, name: staff.user.name, hourlyWage: staff.hourlyWage }, ...payroll, attendances };
  }

  async getMyPayroll(userId: string, yearMonth: string) {
    const staffRecords = await this.prisma.storeStaff.findMany({
      where: { userId, leftAt: null },
      include: { store: { select: { id: true, name: true } } },
    });

    return Promise.all(
      staffRecords.map(async (staff) => ({
        store: staff.store,
        ...(await this.calcPayroll(staff.id, staff.hourlyWage, yearMonth)),
      })),
    );
  }

  // 근무시간 기반 급여 계산
  private async calcPayroll(staffId: string, hourlyWage: number, yearMonth: string) {
    const attendances = await this.getMonthAttendances(staffId, yearMonth);
    const totalMinutes = attendances.reduce((acc, a) => {
      if (!a.clockOut) return acc;
      return acc + Math.floor((a.clockOut.getTime() - a.clockIn.getTime()) / 60000);
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const basePay = totalHours * hourlyWage;
    const deduction = Math.floor(basePay * 0.033); // 3.3%

    return { totalMinutes, totalHours, basePay, deduction, netPay: basePay - deduction };
  }

  private async getMonthAttendances(staffId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);
    return this.prisma.attendance.findMany({
      where: { staffId, clockIn: { gte: from, lt: to } },
      orderBy: { clockIn: 'asc' },
    });
  }
}
