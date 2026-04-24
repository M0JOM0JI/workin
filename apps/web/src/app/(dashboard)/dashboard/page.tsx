'use client';

import { Header } from '@/components/layout';
import { Card, Badge, Spinner, Empty } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { useTodayAttendance, useTodaySchedules, useMonthPayrollSummary } from '@/hooks/useDashboard';
import { formatTime } from '@workin/utils';

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko });
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const { data: attendances = [], isLoading: loadingAtt } = useTodayAttendance(currentStoreId);
  const { data: schedules = [], isLoading: loadingSched } = useTodaySchedules(currentStoreId);
  const { data: payroll } = useMonthPayrollSummary(currentStoreId);

  const now     = new Date();
  const working = attendances.filter((a: any) => !a.clockOut).length;
  const total   = schedules.length;
  const absent  = schedules.filter((s: any) => {
    const hasAtt = attendances.some((a: any) => a.staffId === s.staffId);
    return !hasAtt && now > new Date(s.startAt);
  }).length;
  const late = schedules.filter((s: any) => {
    const att = attendances.find((a: any) => a.staffId === s.staffId);
    return att && new Date(att.clockIn) > new Date(s.startAt);
  }).length;

  return (
    <>
      <Header title="대시보드" description={today} />

      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label="오늘 출근" value={`${working}`} total={`${total}명`} color="green" />
        <StatCard label="오늘 스케줄" value={`${total}`} total="건" color="blue" />
        <StatCard label="지각" value={`${late}`} total="명" color="orange" />
        <StatCard label="결근" value={`${absent}`} total="명" color="red" />
        <StatCard
          label="이번달 예상 급여"
          value={payroll ? `₩${payroll.totalNetPay.toLocaleString()}` : '---'}
          total=""
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 스케줄 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">오늘 스케줄</h3>
            <a href="/schedules" className="text-xs text-primary-600 hover:underline">전체 보기</a>
          </div>
          {loadingSched ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : schedules.length === 0 ? (
            <Empty label="오늘 스케줄이 없습니다" />
          ) : (
            <div className="space-y-3">
              {schedules.map((s: any) => {
                const att = attendances.find((a: any) => a.staffId === s.staffId);
                const isAbsent = !att && now > new Date(s.startAt);
                const isLateClockIn = att && !att.clockOut && new Date(att.clockIn) > new Date(s.startAt);
                const status = att
                  ? (att.clockOut ? '퇴근' : isLateClockIn ? '지각' : '출근')
                  : isAbsent ? '결근' : '예정';
                const badgeVariant =
                  status === '출근' ? 'green' :
                  status === '지각' ? 'orange' :
                  status === '퇴근' ? 'gray' :
                  status === '결근' ? 'red' : 'yellow';
                return (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.staff?.user?.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatTime(s.startAt)} ~ {formatTime(s.endAt)}
                      </p>
                    </div>
                    <Badge variant={badgeVariant} dot>
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 출근 현황 도넛 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">출근 현황</h3>
            <a href="/attendance" className="text-xs text-primary-600 hover:underline">자세히</a>
          </div>
          {loadingAtt ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#2563eb" strokeWidth="3"
                    strokeDasharray={`${total > 0 ? (working / total) * 100 : 0} ${total > 0 ? 100 - (working / total) * 100 : 100}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{working}/{total}</span>
                  <span className="text-xs text-gray-400">출근</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function StatCard({
  label, value, total, color,
}: { label: string; value: string; total: string; color: 'green' | 'blue' | 'purple' | 'red' | 'orange' }) {
  const colorMap = {
    green:  'text-green-600',
    blue:   'text-blue-600',
    purple: 'text-purple-600',
    red:    'text-red-500',
    orange: 'text-orange-500',
  };
  return (
    <Card padding="md">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {value} <span className="text-sm font-normal text-gray-400">{total}</span>
      </p>
    </Card>
  );
}
