/**
 * 근무시간(분)과 시급으로 급여 계산
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
