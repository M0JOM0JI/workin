'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Avatar, Badge, Button, Modal, Spinner, Empty } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { useAttendance, type Attendance } from '@/hooks/useAttendance';
import { formatTime } from '@workin/utils';
import { api } from '@/lib/api';

const statusConfig = {
  working: { label: '근무 중', variant: 'green'  as const },
  done:    { label: '퇴근',   variant: 'gray'   as const },
  pending: { label: '출근 전', variant: 'yellow' as const },
};

function getStatus(att: Attendance): keyof typeof statusConfig {
  if (att.clockOut) return 'done';
  return 'working';
}

/** UTC ISO + KST HH:MM 입력값 → UTC ISO string */
function kstTimeToUtc(baseUtcIso: string, kstTime: string): string {
  const base = new Date(baseUtcIso);
  // UTC+9 적용해서 KST 날짜 추출
  const kstDate = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  const y = kstDate.getUTCFullYear();
  const mo = kstDate.getUTCMonth();
  const d = kstDate.getUTCDate();
  const [h, m] = kstTime.split(':').map(Number);
  // KST → UTC (h - 9, Date.UTC가 overflow 자동 처리)
  return new Date(Date.UTC(y, mo, d, h - 9, m, 0, 0)).toISOString();
}

export default function AttendancePage() {
  const today = format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko });
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const qc = useQueryClient();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const { data: attendances = [], isLoading, error } = useAttendance(currentStoreId, new Date());

  const working = attendances.filter((a) => !a.clockOut).length;
  const done    = attendances.filter((a) => a.clockOut).length;

  // ── 수동 수정 모달 ─────────────────────────────────
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [clockInTime,  setClockInTime]  = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [editError, setEditError] = useState('');

  function handleOpenEdit(att: Attendance) {
    setSelected(att);
    setClockInTime(formatTime(att.clockIn));
    setClockOutTime(att.clockOut ? formatTime(att.clockOut) : '');
    setEditError('');
  }

  const updateMutation = useMutation({
    mutationFn: (body: { clockIn?: string; clockOut?: string | null }) =>
      api.patch(`/stores/${currentStoreId}/attendance/${selected!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', currentStoreId, dateStr] });
      setSelected(null);
    },
    onError: (e: any) => {
      setEditError(e.response?.data?.message ?? '수정에 실패했습니다.');
    },
  });

  function handleSave() {
    if (!selected) return;
    setEditError('');

    const newClockIn  = kstTimeToUtc(selected.clockIn, clockInTime);
    const newClockOut = clockOutTime
      ? kstTimeToUtc(selected.clockOut ?? selected.clockIn, clockOutTime)
      : null;

    // clockIn이 clockOut보다 늦으면 에러
    if (newClockOut && new Date(newClockIn) >= new Date(newClockOut)) {
      setEditError('출근 시간이 퇴근 시간보다 늦을 수 없습니다.');
      return;
    }

    const body: { clockIn?: string; clockOut?: string | null } = {};
    if (newClockIn !== selected.clockIn) body.clockIn = newClockIn;
    if (clockOutTime) body.clockOut = newClockOut;
    else if (selected.clockOut) body.clockOut = null; // 퇴근 시간 제거

    if (Object.keys(body).length === 0) { setSelected(null); return; }
    updateMutation.mutate(body);
  }

  return (
    <>
      <Header title="출근 현황" description={today} />

      {/* 요약 카드 */}
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
            const cfg = statusConfig[getStatus(a)];
            const name = a.staff?.user?.name ?? '-';
            return (
              <div
                key={a.id}
                onClick={() => canManage && handleOpenEdit(a)}
                className={`flex items-center gap-4 px-5 py-4 transition-colors
                  ${i < attendances.length - 1 ? 'border-b border-gray-50' : ''}
                  ${canManage ? 'cursor-pointer hover:bg-gray-50' : ''}
                `}
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
                {canManage && (
                  <span className="text-gray-300 text-lg ml-1">›</span>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* 출퇴근 수정 모달 */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="출퇴근 시간 수정"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <Avatar name={selected.staff?.user?.name ?? '-'} size="md" />
              <div>
                <p className="font-semibold text-gray-800">{selected.staff?.user?.name ?? '-'}</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(selected.clockIn), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  출근 시간 <span className="text-xs text-gray-400">(KST)</span>
                </label>
                <input
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  퇴근 시간 <span className="text-xs text-gray-400">(KST · 미입력 시 근무 중)</span>
                </label>
                <input
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {clockOutTime && (
                  <button
                    type="button"
                    onClick={() => setClockOutTime('')}
                    className="text-xs text-gray-400 hover:text-red-500 mt-1"
                  >
                    퇴근 시간 제거 (근무 중으로 변경)
                  </button>
                )}
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={updateMutation.isPending || !clockInTime}
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
