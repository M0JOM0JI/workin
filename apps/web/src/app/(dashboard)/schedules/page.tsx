'use client';

import { useState } from 'react';
import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Header } from '@/components/layout';
import { Button, Card, Spinner, Empty } from '@/components/ui';
import { ScheduleBlock, getStaffColor } from '@/components/domain/schedule-block';
import { useAuthStore } from '@/store/auth.store';
import { useSchedules } from '@/hooks/useSchedules';
import { getKSTHour, getKSTDateStr } from '@workin/utils';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08 ~ 23
const DAYS  = ['월', '화', '수', '목', '금', '토', '일'];

export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${format(days[0], 'MM.dd')} - ${format(days[6], 'MM.dd')}`;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: schedules = [], isLoading } = useSchedules(currentStoreId, weekStart, weekEnd);

  // staffName 중복 제거 → colorIndex 부여
  const staffColorMap = new Map<string, number>();
  schedules.forEach((s) => {
    const name = s.staff?.user?.name ?? '';
    if (!staffColorMap.has(name)) staffColorMap.set(name, staffColorMap.size);
  });

  return (
    <>
      <Header
        title="스케줄 관리"
        actions={<Button size="sm">+ 시프트 추가</Button>}
      />

      {/* 주간 네비 */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none"
        >‹</button>
        <span className="text-sm font-semibold text-gray-700 w-36 text-center">{weekLabel}</span>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none"
        >›</button>
        <button
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="ml-2 text-xs text-primary-600 hover:underline"
        >오늘</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <Card padding="none" className="overflow-auto">
          <div className="min-w-[700px]">
            {/* 헤더 행 */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100">
              <div className="p-3" />
              {days.map((d, i) => {
                const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div key={i} className="p-3 text-center border-l border-gray-100">
                    <p className={`text-xs font-medium ${isToday ? 'text-primary-600' : 'text-gray-400'}`}>
                      {DAYS[i]}
                    </p>
                    <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                      {format(d, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 시간 행 */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-50 min-h-[52px]">
                <div className="p-2 text-right pr-3">
                  <span className="text-xs text-gray-300">{hour}:00</span>
                </div>
                {days.map((day, dayIdx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const blocks = schedules.filter((s) => {
                    const start = new Date(s.startAt);
                    const startHour = getKSTHour(start);
                    const startDay  = getKSTDateStr(start);
                    return startDay === dayStr && startHour === hour;
                  });
                  return (
                    <div key={dayIdx} className="border-l border-gray-50 p-1 space-y-0.5">
                      {blocks.map((b) => {
                        const name = b.staff?.user?.name ?? '';
                        const colorIndex = staffColorMap.get(name) ?? 0;
                        return (
                          <ScheduleBlock
                            key={b.id}
                            staffName={name}
                            startAt={b.startAt}
                            endAt={b.endAt}
                            colorIndex={colorIndex}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="py-12">
                <Empty label="이번 주 스케줄이 없습니다" />
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
