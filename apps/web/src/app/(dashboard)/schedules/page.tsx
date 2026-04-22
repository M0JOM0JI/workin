'use client';

import { useState } from 'react';
import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Header } from '@/components/layout';
import { Button, Card, Spinner, Empty, Modal, Input } from '@/components/ui';
import { ScheduleBlock, getStaffColor } from '@/components/domain/schedule-block';
import { useAuthStore } from '@/store/auth.store';
import { useSchedules, useCreateSchedule, useDeleteSchedule } from '@/hooks/useSchedules';
import { useStaffs } from '@/hooks/useStaffs';
import { getKSTHour, getKSTDateStr } from '@workin/utils';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08 ~ 23
const DAYS  = ['월', '화', '수', '목', '금', '토', '일'];

function toDatetimeLocal(dateStr: string, timeStr: string) {
  return `${dateStr}T${timeStr}:00.000Z`;
}

export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const currentStoreId = useAuthStore((s) => s.currentStoreId);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${format(days[0], 'MM.dd')} - ${format(days[6], 'MM.dd')}`;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: schedules = [], isLoading } = useSchedules(currentStoreId, weekStart, weekEnd);
  const { data: staffs = [] } = useStaffs(currentStoreId);
  const createMutation = useCreateSchedule(currentStoreId);
  const deleteMutation = useDeleteSchedule(currentStoreId);

  // staffName 중복 제거 → colorIndex 부여
  const staffColorMap = new Map<string, number>();
  schedules.forEach((s) => {
    const name = s.staff?.user?.name ?? '';
    if (!staffColorMap.has(name)) staffColorMap.set(name, staffColorMap.size);
  });

  // 시프트 추가 모달 상태
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    staffId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '18:00',
  });
  const [addError, setAddError] = useState('');

  // 삭제 확인 모달 상태
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeStaffs = staffs.filter((s) => !s.leftAt);

  function handleAddOpen() {
    setAddForm({
      staffId: activeStaffs[0]?.id ?? '',
      date: format(days[0], 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '18:00',
    });
    setAddError('');
    setAddOpen(true);
  }

  async function handleAddSubmit() {
    if (!addForm.staffId) { setAddError('직원을 선택해주세요.'); return; }
    if (addForm.startTime >= addForm.endTime) { setAddError('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }
    setAddError('');
    try {
      // KST 시간 → UTC: HH:mm(KST) = HH-9:mm(UTC)
      const kstToUtc = (dateStr: string, timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(Date.UTC(
          Number(dateStr.slice(0, 4)),
          Number(dateStr.slice(5, 7)) - 1,
          Number(dateStr.slice(8, 10)),
          h - 9, m, 0, 0,
        ));
        return d.toISOString();
      };
      await createMutation.mutateAsync({
        staffId: addForm.staffId,
        startAt: kstToUtc(addForm.date, addForm.startTime),
        endAt:   kstToUtc(addForm.date, addForm.endTime),
      });
      setAddOpen(false);
    } catch (e: any) {
      setAddError(e.response?.data?.message ?? '저장에 실패했습니다.');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  }

  return (
    <>
      <Header
        title="스케줄 관리"
        actions={<Button size="sm" onClick={handleAddOpen}>+ 시프트 추가</Button>}
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
                    return getKSTDateStr(start) === dayStr && getKSTHour(start) === hour;
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
                            onClick={() => setDeleteId(b.id)}
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

      {/* 시프트 추가 모달 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="시프트 추가">
        <div className="space-y-4">
          {addError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={addForm.staffId}
              onChange={(e) => setAddForm({ ...addForm, staffId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {activeStaffs.length === 0 && <option value="">등록된 직원이 없습니다</option>}
              {activeStaffs.map((s) => (
                <option key={s.id} value={s.id}>{s.user.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="날짜"
            type="date"
            value={addForm.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setAddForm({ ...addForm, date: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작 시간 (KST)"
              type="time"
              value={addForm.startTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAddForm({ ...addForm, startTime: e.target.value })
              }
            />
            <Input
              label="종료 시간 (KST)"
              type="time"
              value={addForm.endTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAddForm({ ...addForm, endTime: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={handleAddSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="시프트 삭제" size="sm">
        <p className="text-sm text-gray-600 mb-5">이 시프트를 삭제하시겠습니까?</p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>
            취소
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
