'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Avatar, Badge, Button, Spinner, Empty, Modal } from '@/components/ui';
import { format, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { usePayroll, useConfirmPayroll, type PayrollItem, type PayrollDetail } from '@/hooks/usePayroll';
import { api } from '@/lib/api';
import { formatTime, formatMinutes } from '@workin/utils';
import { useQuery } from '@tanstack/react-query';

const insuranceLabel = {
  NONE:        '미가입',
  THREE_THREE: '3.3%',
  FOUR_MAJOR:  '4대보험',
};

function BreakdownRow({ label, value, red, bold, indent }: {
  label: string; value: string;
  red?: boolean; bold?: boolean; indent?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${indent ? 'pl-3' : ''}`}>
      <span className={`${bold ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
      <span className={`font-medium ${red ? 'text-red-500' : bold ? 'text-primary-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date());
  const yearMonth = format(month, 'yyyy-MM');
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const { data: payroll, isLoading, error } = usePayroll(currentStoreId, month);
  const confirmMutation = useConfirmPayroll(currentStoreId);

  // ── 직원별 상세 모달 ────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<PayrollItem | null>(null);

  const { data: detail, isLoading: detailLoading } = useQuery<PayrollDetail>({
    queryKey: ['payroll-detail', currentStoreId, selectedStaff?.staffId, yearMonth],
    queryFn: async () => {
      const { data } = await api.get(
        `/stores/${currentStoreId}/payroll/${selectedStaff!.staffId}`,
        { params: { yearMonth } },
      );
      return data;
    },
    enabled: !!selectedStaff && !!currentStoreId,
  });

  async function handleConfirm() {
    if (!selectedStaff) return;
    if (!window.confirm(`${selectedStaff.name}의 ${format(month, 'M월')} 급여를 확정하시겠습니까?`)) return;
    await confirmMutation.mutateAsync({ staffId: selectedStaff.staffId, yearMonth });
    setSelectedStaff(null);
  }

  const fmt = (n: number) => `${n.toLocaleString()}원`;
  const fmtMin = (m: number) => formatMinutes(m);

  return (
    <>
      <Header title="급여 관리" />

      {/* 월 선택 */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">‹</button>
        <span className="text-sm font-semibold text-gray-700 w-24 text-center">
          {format(month, 'yyyy년 MM월')}
        </span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg">›</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <Empty label="데이터를 불러오지 못했습니다" />
      ) : !payroll || payroll.items.length === 0 ? (
        <Empty label="해당 월의 급여 데이터가 없습니다" />
      ) : (
        <>
          {/* 총 지급 요약 */}
          <Card padding="md" className="mb-5 bg-primary-600 border-0">
            <p className="text-sm text-blue-100 mb-1">총 지급 예정액</p>
            <p className="text-3xl font-bold text-white">
              ₩ {payroll.totalNetPay.toLocaleString()}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-blue-200">
              <span>{payroll.staffCount}명</span>
              {payroll.totalWeeklyAllowance > 0 && (
                <span>주휴수당 {fmt(payroll.totalWeeklyAllowance)}</span>
              )}
              {payroll.totalNightAllowance > 0 && (
                <span>야간 {fmt(payroll.totalNightAllowance)}</span>
              )}
              {payroll.totalOvertimePay > 0 && (
                <span>초과 {fmt(payroll.totalOvertimePay)}</span>
              )}
            </div>
          </Card>

          {/* 알바생별 목록 */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-[1fr_70px_90px_90px_90px] text-xs font-medium text-gray-400">
                <span>이름</span>
                <span className="text-right">근무</span>
                <span className="text-right">기본급</span>
                <span className="text-right">추가수당</span>
                <span className="text-right">실지급</span>
              </div>
            </div>
            {payroll.items.map((p, i) => {
              const extra = p.nightAllowance + p.overtimePay + p.weeklyAllowance;
              return (
                <div
                  key={p.staffId}
                  onClick={() => setSelectedStaff(p)}
                  className={`px-5 py-4 grid grid-cols-[1fr_70px_90px_90px_90px] items-center hover:bg-gray-50 cursor-pointer transition-colors ${
                    i < payroll.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.name} size="sm" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800 block truncate">{p.name}</span>
                      <span className="text-xs text-gray-400">{insuranceLabel[p.insuranceType]}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 text-right">{fmtMin(p.totalMinutes)}</span>
                  <span className="text-sm text-gray-500 text-right">{p.basePay.toLocaleString()}</span>
                  <span className={`text-sm text-right ${extra > 0 ? 'text-green-600 font-medium' : 'text-gray-300'}`}>
                    {extra > 0 ? `+${extra.toLocaleString()}` : '-'}
                  </span>
                  <span className="text-sm font-bold text-gray-900 text-right">{p.netPay.toLocaleString()}</span>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* ── 직원별 상세 모달 ── */}
      <Modal
        open={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        title={selectedStaff ? `${selectedStaff.name} · ${format(month, 'M월')} 급여` : ''}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : detail ? (
          <div className="space-y-5">
            {/* 확정 상태 */}
            <div className="flex items-center justify-between">
              <Badge variant={detail.isConfirmed ? 'green' : 'yellow'}>
                {detail.isConfirmed ? `✓ 확정됨 · ${format(new Date(detail.confirmedAt!), 'MM.dd')}` : '미확정'}
              </Badge>
              {canManage && !detail.isConfirmed && (
                <Button size="sm" onClick={handleConfirm} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? '처리 중...' : '급여 확정'}
                </Button>
              )}
            </div>

            {/* 급여 breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <BreakdownRow label="시급" value={`${detail.staff.hourlyWage.toLocaleString()}원`} />
              <BreakdownRow label="총 근무시간" value={fmtMin(detail.totalMinutes)} />

              <div className="border-t border-gray-200 my-2" />

              <BreakdownRow label="기본급" value={fmt(detail.basePay)} />

              {detail.weeklyAllowance > 0 && (
                <BreakdownRow label="주휴수당" value={`+${fmt(detail.weeklyAllowance)}`} indent />
              )}
              {detail.nightMinutes > 0 && (
                <BreakdownRow
                  label={`야간수당 (${fmtMin(detail.nightMinutes)})`}
                  value={`+${fmt(detail.nightAllowance)}`}
                  indent
                />
              )}
              {detail.overtimeMinutes > 0 && (
                <BreakdownRow
                  label={`초과수당 (${fmtMin(detail.overtimeMinutes)})`}
                  value={`+${fmt(detail.overtimePay)}`}
                  indent
                />
              )}

              <BreakdownRow
                label={`공제 (${insuranceLabel[detail.staff.insuranceType]})`}
                value={`-${fmt(detail.deduction)}`}
                red
              />

              <div className="border-t border-gray-200 pt-2 mt-2">
                <BreakdownRow
                  label="실지급액"
                  value={fmt(detail.netPay)}
                  bold
                />
              </div>
            </div>

            {/* 출퇴근 내역 */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">출퇴근 내역</h4>
              {detail.attendances.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">근무 기록이 없습니다</p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {detail.attendances.map((a) => {
                    const minutes = a.clockOut
                      ? Math.floor((new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 60000)
                      : null;
                    return (
                      <div key={a.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm">
                        <span className="text-gray-700 font-medium w-28">
                          {format(new Date(a.clockIn), 'MM.dd (EEE)', { locale: ko })}
                        </span>
                        <span className="text-gray-500 flex-1 text-center">
                          {formatTime(a.clockIn)}
                          {a.clockOut ? ` ~ ${formatTime(a.clockOut)}` : ' (근무중)'}
                        </span>
                        {minutes != null && (
                          <span className="text-primary-600 font-medium w-16 text-right">
                            {fmtMin(minutes)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
