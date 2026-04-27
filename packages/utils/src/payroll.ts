/**
 * 근무시간(분)과 시급으로 기본 급여 계산
 */
export function calcPayroll(totalMinutes: number, hourlyWage: number) {
  const totalHours = Math.floor(totalMinutes / 60);
  const basePay = totalHours * hourlyWage;
  const deduction = Math.floor(basePay * 0.033); // 3.3% 공제
  return { totalHours, basePay, deduction, netPay: basePay - deduction };
}

/**
 * 주휴수당 지급 여부 판단
 * 조건: 1주 소정 근로시간 15시간 이상
 */
export function isEligibleForWeeklyAllowance(weeklyMinutes: number): boolean {
  return weeklyMinutes >= 15 * 60;
}

/**
 * 주휴수당 계산
 * 공식: (1주 근무시간 / 40) × 8 × 시급
 */
export function calcWeeklyAllowance(weeklyMinutes: number, hourlyWage: number): number {
  const weeklyHours = weeklyMinutes / 60;
  return Math.floor((weeklyHours / 40) * 8 * hourlyWage);
}

/**
 * 4대보험 / 3.3% 공제 계산
 * - NONE: 0
 * - THREE_THREE: 총급여 × 3.3%
 * - FOUR_MAJOR: 직원 부담분 (국민연금 4.5% + 건강보험 3.545% + 장기요양 0.454% + 고용보험 0.9% ≈ 9.4%)
 */
export type InsuranceType = 'NONE' | 'THREE_THREE' | 'FOUR_MAJOR';

export function calcDeduction(totalGross: number, insuranceType: InsuranceType): number {
  if (insuranceType === 'THREE_THREE') return Math.floor(totalGross * 0.033);
  if (insuranceType === 'FOUR_MAJOR')  return Math.floor(totalGross * 0.094);
  return 0;
}
