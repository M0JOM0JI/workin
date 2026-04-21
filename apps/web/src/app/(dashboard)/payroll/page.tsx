'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Card, Avatar, Spinner, Empty } from '@/components/ui';
import { format, subMonths, addMonths } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { usePayroll } from '@/hooks/usePayroll';

export default function PayrollPage() {
  const [month, setMonth] = useState(new Date());
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const { data: payroll, isLoading, error } = usePayroll(currentStoreId, month);

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
                className={`px-5 py-4 grid grid-cols-[1fr_60px_80px_80px_80px] items-center hover:bg-gray-50 cursor-pointer ${
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
    </>
  );
}
