'use client';

import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { Header } from '@/components/layout';
import { Card, Avatar, Spinner, Empty, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useStaffsStatistics } from '@/hooks/useStatistics';
import { formatMinutes } from '@workin/utils';

function StatBadge({ count, type }: { count: number; type: 'late' | 'absent' }) {
  if (count === 0) return <span className="text-gray-300 text-sm">-</span>;
  return (
    <Badge variant={type === 'late' ? 'orange' : 'red'}>
      {count}회
    </Badge>
  );
}

export default function StatisticsPage() {
  const [month, setMonth] = useState(new Date());
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const { data, isLoading, error } = useStaffsStatistics(currentStoreId, month);

  const items = data?.items ?? [];

  // 매장 요약 집계
  const totalWorkDays    = items.reduce((s, i) => s + i.workDays, 0);
  const totalMinutes     = items.reduce((s, i) => s + i.totalMinutes, 0);
  const totalLate        = items.reduce((s, i) => s + i.lateCount, 0);
  const totalAbsent      = items.reduce((s, i) => s + i.absentCount, 0);

  return (
    <>
      <Header title="근무 통계" />

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
      ) : items.length === 0 ? (
        <Empty label="해당 월의 통계 데이터가 없습니다" />
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: '직원 수',        value: `${data?.staffCount ?? 0}명`,          color: 'text-primary-600' },
              { label: '총 근무시간',    value: formatMinutes(totalMinutes),           color: 'text-gray-900' },
              { label: '지각 (합계)',    value: `${totalLate}회`,                      color: totalLate > 0 ? 'text-orange-600' : 'text-gray-400' },
              { label: '결근 (합계)',    value: `${totalAbsent}회`,                    color: totalAbsent > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map(({ label, value, color }) => (
              <Card key={label} padding="md" className="text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          {/* 직원별 통계 테이블 */}
          <Card padding="none">
            {/* 테이블 헤더 */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-[1fr_60px_90px_70px_60px_60px] text-xs font-medium text-gray-400">
                <span>이름</span>
                <span className="text-right">근무일</span>
                <span className="text-right">총 근무</span>
                <span className="text-right">평균/일</span>
                <span className="text-right">지각</span>
                <span className="text-right">결근</span>
              </div>
            </div>

            {items.map((item, i) => (
              <div
                key={item.staffId}
                className={`px-5 py-4 grid grid-cols-[1fr_60px_90px_70px_60px_60px] items-center ${
                  i < items.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                {/* 이름 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={item.name} size="sm" />
                  <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                </div>

                {/* 근무일 */}
                <span className="text-sm text-gray-700 text-right font-medium">
                  {item.workDays}일
                </span>

                {/* 총 근무시간 */}
                <span className="text-sm text-gray-700 text-right">
                  {formatMinutes(item.totalMinutes)}
                </span>

                {/* 평균 근무시간/일 */}
                <span className="text-sm text-gray-500 text-right">
                  {item.workDays > 0 ? formatMinutes(item.avgMinutes) : '-'}
                </span>

                {/* 지각 */}
                <div className="flex justify-end">
                  <StatBadge count={item.lateCount} type="late" />
                </div>

                {/* 결근 */}
                <div className="flex justify-end">
                  <StatBadge count={item.absentCount} type="absent" />
                </div>
              </div>
            ))}
          </Card>

          {/* 범례 */}
          <div className="flex gap-4 mt-3 px-1">
            <p className="text-xs text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />
              지각: 스케줄 시작 5분 초과
            </p>
            <p className="text-xs text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />
              결근: 스케줄 있었으나 미출근
            </p>
          </div>
        </>
      )}
    </>
  );
}
