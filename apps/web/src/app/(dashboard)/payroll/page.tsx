'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Avatar, Spinner, Empty, Modal } from '@/components/ui';
import { format, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { usePayroll, type PayrollItem } from '@/hooks/usePayroll';
import { api } from '@/lib/api';
import { formatTime } from '@workin/utils';

interface StaffPayrollDetail {
  staff: { id: string; name: string; hourlyWage: number };
  totalMinutes: number;
  totalHours: number;
  basePay: number;
  deduction: number;
  netPay: number;
  attendances: { id: string; clockIn: string; clockOut: string | null }[];
}

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date());
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const { data: payroll, isLoading, error } = usePayroll(currentStoreId, month);

  // 직원별 상세 모달
  const [selectedStaff, setSelectedStaff] = useState<PayrollItem | null>(null);
  const yearMonth = format(month, 'yyyy-MM');

  const { data: detail, isLoading: detailLoading } = useQuery<StaffPayrollDetail>({
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

  return (
    <>
      <Header title="급여 관리" />

      {/* 월 선택 */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg"
        >‹</button>
        <span className="text-sm font-semibold text-gray-700 w-24 text-center">
          {format(month, 'yyyy년 MM월')}
        </span>
        <button
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg"
        >›</button>
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
            <p className="text-xs text-blue-200 mt-1">
              {payroll.staffCount}명 · 세후 기준
            </p>
          </Card>

          {/* 알바생별 목록 */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-[1fr_60px_80px_80px_80px] text-xs font-medium text-gray-400">
                <span>이름</span>
                <span className="text-right">시간</span>
                <span className="text-right">기본급</span>
                <span className="text-right">공제</span>
                <span className="text-right">실지급</span>
              </div>
            </div>
            {payroll.items.map((p, i) => (
              <div
                key={p.staffId}
                onClick={() => setSelectedStaff(p)}
                className={`px-5 py-4 grid grid-cols-[1fr_60px_80px_80px_80px] items-center hover:bg-gray-50 cursor-pointer transition-colors ${
                  i < payroll.items.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                </div>
                <span className="text-sm text-gray-500 text-right">{p.totalHours}h</span>
                <span className="text-sm text-gray-500 text-right">
                  {p.basePay.toLocaleString()}
                </span>
                <span className="text-sm text-red-400 text-right">
                  -{p.deduction.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-gray-900 text-right">
                  {p.netPay.toLocaleString()}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* 직원별 상세 모달 */}
      <Modal
        open={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        title={selectedStaff ? `${selectedStaff.name} · ${format(month, 'M월')} 급여 상세` : ''}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : detail ? (
          <div className="space-y-4">
            {/* 급여 요약 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {[
                { label: '시급', value: `${detail.staff.hourlyWage.toLocaleString()}원` },
                { label: '총 근무시간', value: `${detail.totalHours}시간` },
                { label: '기본급', value: `${detail.basePay.toLocaleString()}원` },
                { label: '3.3% 공제', value: `-${detail.deduction.toLocaleString()}원`, red: true },
              ].map(({ label, value, red }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-medium ${red ? 'text-red-500' : 'text-gray-800'}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-800">실지급액</span>
                <span className="text-primary-600">{detail.netPay.toLocaleString()}원</span>
              </div>
            </div>

            {/* 출퇴근 내역 */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">출퇴근 내역</h4>
              {detail.attendances.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">근무 기록이 없습니다</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {detail.attendances.map((a) => {
                    const minutes = a.clockOut
                      ? Math.floor((new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 60000)
                      : null;
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm">
                        <span className="text-gray-700 font-medium">
                          {format(new Date(a.clockIn), 'MM.dd (EEE)', { locale: ko })}
                        </span>
                        <span className="text-gray-500">
                          {formatTime(a.clockIn)}
                          {a.clockOut ? ` ~ ${formatTime(a.clockOut)}` : ' (근무중)'}
                        </span>
                        {minutes && (
                          <span className="text-primary-600 font-medium">
                            {Math.floor(minutes / 60)}h {minutes % 60 > 0 ? `${minutes % 60}m` : ''}
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
