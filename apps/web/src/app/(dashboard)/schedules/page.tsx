'use client';

import { useState } from 'react';
import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Header } from '@/components/layout';
import { Button, Card, Spinner, Empty, Modal, Input, Badge } from '@/components/ui';
import { ScheduleBlock, getStaffColor } from '@/components/domain/schedule-block';
import { useAuthStore } from '@/store/auth.store';
import {
  useSchedules, useCreateSchedule, useDeleteSchedule,
  useUpdateSchedule, useConfirmSchedule, useCopyWeek,
  type Schedule,
} from '@/hooks/useSchedules';
import { useStaffs } from '@/hooks/useStaffs';
import { getKSTHour, getKSTDateStr, formatTime } from '@workin/utils';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08 ~ 23
const DAYS  = ['월', '화', '수', '목', '금', '토', '일'];

/** KST HH:MM + 날짜(yyyy-MM-dd) → UTC ISO */
function kstToUtc(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    h - 9, m, 0, 0,
  )).toISOString();
}

/** UTC ISO → KST HH:MM */
function utcToKstTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${format(days[0], 'MM.dd')} - ${format(days[6], 'MM.dd')}`;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: schedules = [], isLoading } = useSchedules(currentStoreId, weekStart, weekEnd);
  const { data: staffs = [] } = useStaffs(currentStoreId);

  const createMutation  = useCreateSchedule(currentStoreId);
  const deleteMutation  = useDeleteSchedule(currentStoreId);
  const updateMutation  = useUpdateSchedule(currentStoreId);
  const confirmMutation = useConfirmSchedule(currentStoreId);
  const copyWeekMutation = useCopyWeek(currentStoreId);

  const staffColorMap = new Map<string, number>();
  schedules.forEach((s) => {
    const name = s.staff?.user?.name ?? '';
    if (!staffColorMap.has(name)) staffColorMap.set(name, staffColorMap.size);
  });

  const activeStaffs = staffs.filter((s) => !s.leftAt);

  // ── 블록 상세 모달 ──────────────────────────────────
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime,   setEditEndTime]   = useState('');
  const [editDate,      setEditDate]      = useState('');
  const [editError,     setEditError]     = useState('');

  function handleOpenDetail(schedule: Schedule) {
    setDetailSchedule(schedule);
    setEditMode(false);
    setEditError('');
    const dateStr = getKSTDateStr(new Date(schedule.startAt));
    setEditDate(dateStr);
    setEditStartTime(utcToKstTime(schedule.startAt));
    setEditEndTime(utcToKstTime(schedule.endAt));
  }

  function handleCloseDetail() {
    setDetailSchedule(null);
    setEditMode(false);
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!detailSchedule) return;
    if (editStartTime >= editEndTime) {
      setEditError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    setEditError('');
    try {
      await updateMutation.mutateAsync({
        id:      detailSchedule.id,
        startAt: kstToUtc(editDate, editStartTime),
        endAt:   kstToUtc(editDate, editEndTime),
      });
      handleCloseDetail();
    } catch (e: any) {
      setEditError(e.response?.data?.message ?? '수정에 실패했습니다.');
    }
  }

  async function handleConfirm() {
    if (!detailSchedule) return;
    await confirmMutation.mutateAsync(detailSchedule.id);
    handleCloseDetail();
  }

  async function handleDelete() {
    if (!detailSchedule) return;
    if (!window.confirm('이 시프트를 삭제하시겠습니까?')) return;
    await deleteMutation.mutateAsync(detailSchedule.id);
    handleCloseDetail();
  }

  // ── 시프트 추가 모달 ────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    staffId: '', date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00', endTime: '18:00',
  });
  const [addError, setAddError] = useState('');

  function handleAddOpen() {
    setAddForm({
      staffId:   activeStaffs[0]?.id ?? '',
      date:      format(days[0], 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime:   '18:00',
    });
    setAddError('');
    setAddOpen(true);
  }

  async function handleAddSubmit() {
    if (!addForm.staffId) { setAddError('직원을 선택해주세요.'); return; }
    if (addForm.startTime >= addForm.endTime) { setAddError('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }
    setAddError('');
    try {
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

  // ── 주간 복사 ──────────────────────────────────────
  async function handleCopyWeek() {
    const fromDate = format(weekStart, 'yyyy-MM-dd');
    if (!window.confirm(`${weekLabel} 주의 시프트 전체를 다음 주로 복사하시겠습니까?`)) return;
    try {
      const result = await copyWeekMutation.mutateAsync(fromDate);
      alert(result.message);
      // 다음 주로 이동
      setWeekStart((d) => addDays(d, 7));
    } catch (e: any) {
      alert(e.response?.data?.message ?? '복사에 실패했습니다.');
    }
  }

  // 확정된 스케줄 수
  const confirmedCount = schedules.filter((s) => s.isConfirmed).length;

  return (
    <>
      <Header
        title="스케줄 관리"
        actions={
          canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopyWeek} disabled={copyWeekMutation.isPending}>
                {copyWeekMutation.isPending ? '복사 중...' : '주간 복사'}
              </Button>
              <Button size="sm" onClick={handleAddOpen}>+ 시프트 추가</Button>
            </div>
          )
        }
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
        {schedules.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {confirmedCount}/{schedules.length} 확정
          </span>
        )}
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
                            isConfirmed={b.isConfirmed}
                            onClick={() => handleOpenDetail(b)}
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

      {/* ── 시프트 상세 / 수정 모달 ── */}
      {detailSchedule && (
        <Modal
          open={!!detailSchedule}
          onClose={handleCloseDetail}
          title={editMode ? '시프트 수정' : '시프트 상세'}
          size="sm"
        >
          <div className="space-y-4">
            {/* 기본 정보 */}
            {!editMode && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{detailSchedule.staff?.user?.name}</p>
                  <Badge variant={detailSchedule.isConfirmed ? 'green' : 'yellow'}>
                    {detailSchedule.isConfirmed ? '✓ 확정' : '미확정'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {format(new Date(detailSchedule.startAt), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                </p>
                <p className="text-sm text-gray-700 font-medium">
                  {formatTime(detailSchedule.startAt)} ~ {formatTime(detailSchedule.endAt)}
                </p>
              </div>
            )}

            {/* 수정 폼 */}
            {editMode && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">날짜</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">시작 (KST)</label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">종료 (KST)</label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                {editError && (
                  <p className="text-xs text-red-500">{editError}</p>
                )}
              </div>
            )}

            {/* 액션 버튼 */}
            {canManage && (
              <div className="space-y-2 pt-1">
                {editMode ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setEditMode(false)}>
                      취소
                    </Button>
                    <Button className="flex-1" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setEditMode(true)}>
                        시간 수정
                      </Button>
                      <Button
                        variant={detailSchedule.isConfirmed ? 'secondary' : 'primary'}
                        className="flex-1"
                        onClick={handleConfirm}
                        disabled={confirmMutation.isPending}
                      >
                        {confirmMutation.isPending
                          ? '처리 중...'
                          : detailSchedule.isConfirmed ? '확정 취소' : '확정'}
                      </Button>
                    </div>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? '삭제 중...' : '시프트 삭제'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── 시프트 추가 모달 ── */}
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
            <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>취소</Button>
            <Button className="flex-1" onClick={handleAddSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
