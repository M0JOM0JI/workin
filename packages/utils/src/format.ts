/**
 * 금액을 한국 원화 형식으로 포맷
 * @example formatKRW(421260) → '₩ 421,260'
 */
export function formatKRW(amount: number): string {
  return `₩ ${amount.toLocaleString('ko-KR')}`;
}

/**
 * 분을 "N시간 M분" 형식으로 포맷
 * @example formatMinutes(550) → '9시간 10분'
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/**
 * 날짜를 'YYYY.MM.DD' 형식으로 포맷
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** UTC 타임스탬프에 KST(+9h) 오프셋을 더한 Date 반환 */
function toKST(date: string | Date): Date {
  return new Date(new Date(date).getTime() + 9 * 60 * 60 * 1000);
}

/**
 * 시간을 'HH:MM' 형식으로 포맷 (KST 기준)
 * Node.js ICU 없이도 정확하게 동작
 */
export function formatTime(date: string | Date): string {
  const kst = toKST(date);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * KST 기준 시(hour, 0-23) 반환
 */
export function getKSTHour(date: string | Date): number {
  return toKST(date).getUTCHours();
}

/**
 * KST 기준 'yyyy-MM-dd' 날짜 문자열 반환
 */
export function getKSTDateStr(date: string | Date): string {
  return toKST(date).toISOString().slice(0, 10);
}
