'use client';

import { Header } from '@/components/layout';
import { Card, Avatar, Badge, Spinner, Empty } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { useAttendance } from '@/hooks/useAttendance';
import { formatTime } from '@workin/utils';

const statusConfig = {
  working: { label: '근무 중', variant: 'green'  as const },
  done:    { label: '퇴근',   variant: 'gray'   as const },
  pending: { label: '출근 전', variant: 'yellow' as const },
  absent:  { label: '결근',   variant: 'red'    as const },
};

function getStatus(att: any): keyof typeof statusConfig {
  if (!att) return 'pending';
  if (att.clockOut) return 'done';
  return 'working';
}

export default function AttendancePage() {
  const today = format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko });
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const { data: attendances = [], isLoading, error } = useAttendance(currentStoreId, new Date());

  const working = attendances.filter((a) => !a.clockOut).length;
  const done    = attendances.filter((a) => a.clockOut).length;

  return (
    <>
      <Header title="출근 현황" description={today} />

      {/* 요약 */}
      <div className="flex gap-3 mb-5">
        {[
          { label: '근무 중', value: working, color: 'text-green-600' },
          { label: '퇴근',   value: done,    color: 'text-gray-500'  },
          { label: '전체',   value: attendances.length, color: 'text-gray-700' },
        ].map((s) => (
          <Card key={s.label} padding="sm" className="flex-1 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <Empty label="데이터를 불러오지 못했습니다" />
      ) : attendances.length === 0 ? (
        <Empty label="오늘 출근 기록이 없습니다" />
      ) : (
        <Card padding="none">
          {attendances.map((a, i) => {
            const status = getStatus(a);
            const cfg = statusConfig[status];
            const name = a.staff?.user?.name ?? '-';
            return (
              <div
                key={a.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i < attendances.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <Avatar name={name} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{name}</p>
                  {a.schedule && (
                    <p className="text-xs text-gray-400">
                      예정 {formatTime(a.schedule.startAt)} ~{' '}
                      {formatTime(a.schedule.endAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    출근 {formatTime(a.clockIn)}
                    {a.clockOut && ` · 퇴근 ${formatTime(a.clockOut)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
