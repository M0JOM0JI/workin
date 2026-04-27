import { Injectable, NotFoundException } from '@nestjs/common';
import { InsuranceType, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';

// ── KST 야간 시간(22:00~06:00) 계산 헬퍼 ─────────────────────────────────────

/**
 * 한 근무 구간에서 야간 시간(분)을 계산한다.
 * 야간: KST 22:00(UTC 13:00) ~ 익일 06:00(UTC 21:00)
 * clockOut이 없으면 0을 반환한다.
 */
function calcNightMinutes(clockIn: Date, clockOut: Date | null): number {
  if (!clockOut) return 0;
  const startMs = clockIn.getTime();
  const endMs   = clockOut.getTime();
  if (endMs <= startMs) return 0;

  const NIGHT_START_OFFSET = 13 * 60 * 60 * 1000; // UTC 13:00 = KST 22:00
  const NIGHT_END_OFFSET   = 21 * 60 * 60 * 1000; // UTC 21:00 = KST 06:00
  const DAY_MS = 24 * 60 * 60 * 1000;

  let nightMs = 0;
  // 해당 구간이 걸쳐있을 수 있는 날짜 범위 (최대 2일치 야간 구간 검사)
  const dayStart = new Date(startMs);
  dayStart.setUTCHours(0, 0, 0, 0);

  for (let d = 0; d < 3; d++) {
    const base = dayStart.getTime() + d * DAY_MS;
    const nightFrom = base + NIGHT_START_OFFSET;
    const nightTo   = base + DAY_MS + NIGHT_END_OFFSET; // 다음날 06:00 UTC

    const overlapStart = Math.max(startMs, nightFrom);
    const overlapEnd   = Math.min(endMs, nightTo);
    if (overlapEnd > overlapStart) {
      nightMs += overlapEnd - overlapStart;
    }
  }
  return Math.floor(nightMs / 60000);
}

/**
 * 한 달의 출퇴근 기록을 주(ISO week 기준 월~일) 단위로 그룹핑하고
 * 주별 근무 분수를 반환한다.
 */
function groupByWeek(attendances: { clockIn: Date; clockOut: Date | null }[]): Map<string, number> {
  const weekMap = new Map<string, number>();
  for (const att of attendances) {
    if (!att.clockOut) continue;
    const minutes = Math.floor((att.clockOut.getTime() - att.clockIn.getTime()) / 60000);
    // ISO 주 키: clockIn 기준 월요일 날짜
    const d = new Date(att.clockIn);
    const day = d.getUTCDay(); // 0=일~6=토
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    monday.setUTCHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + minutes);
  }
  return weekMap;
}

// ── 공제 계산 ─────────────────────────────────────────────────────────────────

function calcDeduction(gross: number, type: InsuranceType): number {
  if (type === InsuranceType.THREE_THREE) return Math.floor(gross * 0.033);
  if (type === InsuranceType.FOUR_MAJOR)  return Math.floor(gross * 0.094);
  return 0;
}

// ── 서비스 ────────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  async getStoreSummary(storeId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    const staffList = await this.prisma.storeStaff.findMany({
      where: { storeId, role: Role.STAFF },
      include: { user: { select: { id: true, name: true } } },
    });

    const items = await Promise.all(
      staffList.map(async (staff) => {
        const calc = await this.calcPayroll(staff.id, staff.hourlyWage, staff.insuranceType, yearMonth, store);
        return {
          staffId:    staff.id,
          name:       staff.user.name,
          hourlyWage: staff.hourlyWage,
          insuranceType: staff.insuranceType,
          ...calc,
        };
      }),
    );

    return {
      yearMonth,
      staffCount:      items.length,
      totalBasePay:    items.reduce((s, i) => s + i.basePay, 0),
      totalNightAllowance: items.reduce((s, i) => s + i.nightAllowance, 0),
      totalOvertimePay:    items.reduce((s, i) => s + i.overtimePay, 0),
      totalWeeklyAllowance: items.reduce((s, i) => s + i.weeklyAllowance, 0),
      totalDeduction:  items.reduce((s, i) => s + i.deduction, 0),
      totalNetPay:     items.reduce((s, i) => s + i.netPay, 0),
      items,
    };
  }

  async getStaffPayroll(storeId: string, staffId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    const staff = await this.prisma.storeStaff.findUniqueOrThrow({
      where: { id: staffId },
      include: { user: { select: { id: true, name: true } } },
    });

    const calc        = await this.calcPayroll(staffId, staff.hourlyWage, staff.insuranceType, yearMonth, store);
    const attendances = await this.getMonthAttendances(staffId, yearMonth);

    // 확정 기록 조회
    const confirmed = await this.prisma.payroll.findUnique({
      where: { staffId_yearMonth: { staffId, yearMonth } },
    });

    return {
      staff: { id: staff.id, name: staff.user.name, hourlyWage: staff.hourlyWage, insuranceType: staff.insuranceType },
      ...calc,
      isConfirmed: confirmed?.isConfirmed ?? false,
      confirmedAt: confirmed?.confirmedAt ?? null,
      attendances,
    };
  }

  async getMyPayroll(userId: string, yearMonth: string) {
    const staffRecords = await this.prisma.storeStaff.findMany({
      where: { userId, leftAt: null },
      include: { store: true },
    });

    return Promise.all(
      staffRecords.map(async (staff) => {
        const calc = await this.calcPayroll(staff.id, staff.hourlyWage, staff.insuranceType, yearMonth, staff.store);
        const confirmed = await this.prisma.payroll.findUnique({
          where: { staffId_yearMonth: { staffId: staff.id, yearMonth } },
        });
        return {
          store: { id: staff.store.id, name: staff.store.name },
          ...calc,
          isConfirmed: confirmed?.isConfirmed ?? false,
          confirmedAt: confirmed?.confirmedAt ?? null,
        };
      }),
    );
  }

  async confirmPayroll(storeId: string, staffId: string, userId: string, yearMonth: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);

    // staffId가 해당 매장 소속인지 확인
    const staff = await this.prisma.storeStaff.findFirst({
      where: { id: staffId, storeId },
    });
    if (!staff) throw new NotFoundException('해당 직원을 찾을 수 없습니다.');

    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    const calc  = await this.calcPayroll(staffId, staff.hourlyWage, staff.insuranceType, yearMonth, store);

    // upsert — 확정 기록 저장
    return this.prisma.payroll.upsert({
      where: { staffId_yearMonth: { staffId, yearMonth } },
      create: {
        storeId,
        staffId,
        yearMonth,
        totalMinutes:    calc.totalMinutes,
        regularMinutes:  calc.regularMinutes,
        nightMinutes:    calc.nightMinutes,
        overtimeMinutes: calc.overtimeMinutes,
        basePay:         calc.basePay,
        nightAllowance:  calc.nightAllowance,
        overtimePay:     calc.overtimePay,
        weeklyAllowance: calc.weeklyAllowance,
        deduction:       calc.deduction,
        netPay:          calc.netPay,
        isConfirmed:     true,
        confirmedAt:     new Date(),
      },
      update: {
        totalMinutes:    calc.totalMinutes,
        regularMinutes:  calc.regularMinutes,
        nightMinutes:    calc.nightMinutes,
        overtimeMinutes: calc.overtimeMinutes,
        basePay:         calc.basePay,
        nightAllowance:  calc.nightAllowance,
        overtimePay:     calc.overtimePay,
        weeklyAllowance: calc.weeklyAllowance,
        deduction:       calc.deduction,
        netPay:          calc.netPay,
        isConfirmed:     true,
        confirmedAt:     new Date(),
      },
    });
  }

  // ── 핵심 급여 계산 ──────────────────────────────────────────────────────────

  private async calcPayroll(
    staffId: string,
    hourlyWage: number,
    insuranceType: InsuranceType,
    yearMonth: string,
    store: {
      nightShiftEnabled: boolean;
      nightShiftMultiplier: number;
      overtimeEnabled: boolean;
      overtimeMultiplier: number;
    },
  ) {
    const attendances = await this.getMonthAttendances(staffId, yearMonth);

    let totalMinutes    = 0;
    let nightMinutes    = 0;
    let overtimeMinutes = 0;

    for (const att of attendances) {
      if (!att.clockOut) continue;

      const workedMin = Math.floor((att.clockOut.getTime() - att.clockIn.getTime()) / 60000);
      totalMinutes += workedMin;

      // 야간 시간
      if (store.nightShiftEnabled) {
        nightMinutes += calcNightMinutes(att.clockIn, att.clockOut);
      }

      // 초과 시간 (스케줄 대비)
      if (store.overtimeEnabled && (att as any).schedule) {
        const sched = (att as any).schedule;
        const schedMin = Math.floor(
          (new Date(sched.endAt).getTime() - new Date(sched.startAt).getTime()) / 60000,
        );
        overtimeMinutes += Math.max(0, workedMin - schedMin);
      }
    }

    const regularMinutes = totalMinutes - nightMinutes;

    // 기본급: 전체 근무시간 × 시급
    const basePay = Math.floor(totalMinutes / 60) * hourlyWage;

    // 야간 수당: 야간 시간에 대한 추가분 (multiplier - 1)
    const nightAllowance = store.nightShiftEnabled
      ? Math.floor((nightMinutes / 60) * hourlyWage * (store.nightShiftMultiplier - 1))
      : 0;

    // 초과근무 수당: 초과 시간에 대한 추가분 (multiplier - 1)
    const overtimePay = store.overtimeEnabled
      ? Math.floor((overtimeMinutes / 60) * hourlyWage * (store.overtimeMultiplier - 1))
      : 0;

    // 주휴수당: 주별 15h 이상 근무 시 발생
    const weekMap = groupByWeek(attendances);
    let weeklyAllowance = 0;
    for (const [, weekMins] of weekMap) {
      if (weekMins >= 15 * 60) {
        const weekHours = weekMins / 60;
        weeklyAllowance += Math.floor((weekHours / 40) * 8 * hourlyWage);
      }
    }

    // 총 급여 (공제 전)
    const grossPay = basePay + nightAllowance + overtimePay + weeklyAllowance;

    // 4대보험 / 3.3% 공제
    const deduction = calcDeduction(grossPay, insuranceType);
    const netPay    = grossPay - deduction;

    return {
      totalMinutes,
      regularMinutes,
      nightMinutes,
      overtimeMinutes,
      basePay,
      nightAllowance,
      overtimePay,
      weeklyAllowance,
      deduction,
      netPay,
    };
  }

  private async getMonthAttendances(staffId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 1);
    return this.prisma.attendance.findMany({
      where: { staffId, clockIn: { gte: from, lt: to } },
      include: { schedule: { select: { startAt: true, endAt: true } } },
      orderBy: { clockIn: 'asc' },
    });
  }
}
