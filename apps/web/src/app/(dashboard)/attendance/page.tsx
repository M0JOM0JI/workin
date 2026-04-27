'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Avatar, Badge, Button, Modal, Spinner, Empty } from '@/components/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { useAttendance, type Attendance } from '@/hooks/useAttendance';
import { useAttendanceRequests, useReviewRequest, type AttendanceRequest } from '@/hooks/useAttendanceRequests';
import { useStaffs } from '@/hooks/useStaffs';
import { formatTime } from '@workin/utils';
import { api } from '@/lib/api';

const statusConfig = {
  working: { label: '근무 중', variant: 'green'  as const },
  done:    { label: '퇴근',   variant: 'gray'   as const },
};

function getStatus(att: Attendance) {
  return att.clockOut ? 'done' : 'working';
}

const reqStatusConfig = {
  PENDING:  { label: '검토 중', variant: 'yellow' as const },
  APPROVED: { label: '승인',    variant: 'green'  as const },
  REJECTED: { label: '거절',    variant: 'red'    as const },
};

/** UTC ISO + KST HH:MM 입력값 → UTC ISO string */
function kstTimeToUtc(baseUtcIso: string, kstTime: string): string {
  const base = new Date(baseUtcIso);
  const kstDate = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  const y = kstDate.getUTCFullYear();
  const mo = kstDate.getUTCMonth();
  const d = kstDate.getUTCDate();
  const [h, m] = kstTime.split(':').map(Number);
  return new Date(Date.UTC(y, mo, d, h - 9, m, 0, 0)).toISOString();
}

/** KST HH:MM → 오늘 날짜 UTC ISO */
function todayKstTimeToUtc(kstTime: string): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kstNow.getUTCFullYear();
  const mo = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const [h, m] = kstTime.split(':').map(Number);
  return new Date(Date.UTC(y, mo, d, h - 9, m, 0, 0)).toISOString();
}

type Tab = 'today' | 'requests';

export default function AttendancePage() {
  const today = format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: ko });
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('today');

  // ── 출근 현황 ──────────────────────────────────────
  const { data: attendances = [], isLoading: loadingAtt, error: errAtt } = useAttendance(currentStoreId, new Date());
  const working = attendances.filter((a) => !a.clockOut).length;
  const done    = attendances.filter((a) => a.clockOut).length;

  // ── 수정 요청 ──────────────────────────────────────
  const { data: requests = [], isLoading: loadingReq } = useAttendanceRequests(
    canManage ? currentStoreId : null,
  );
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const reviewMutation = useReviewRequest(currentStoreId);

  // ── 수동 수정 모달 (OWNER/MANAGER) ──────────────────
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [clockInTime,  setClockInTime]  = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [editError, setEditError] = useState('');

  const updateMutation = useMutation({
    mutationFn: (body: { clockIn?: string; clockOut?: string | null }) =>
      api.patch(`/stores/${currentStoreId}/attendance/${selected!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', currentStoreId, dateStr] });
      setSelected(null);
    },
    onError: (e: any) => setEditError(e.response?.data?.message ?? '수정에 실패했습니다.'),
  });

  function handleOpenEdit(att: Attendance) {
    setSelected(att);
    setClockInTime(formatTime(att.clockIn));
    setClockOutTime(att.clockOut ? formatTime(att.clockOut) : '');
    setEditError('');
  }

  function handleSave() {
    if (!selected) return;
    setEditError('');
    const newClockIn  = kstTimeToUtc(selected.clockIn, clockInTime);
    const newClockOut = clockOutTime ? kstTimeToUtc(selected.clockOut ?? selected.clockIn, clockOutTime) : null;
    if (newClockOut && new Date(newClockIn) >= new Date(newClockOut)) {
      setEditError('출근 시간이 퇴근 시간보다 늦을 수 없습니다.');
      return;
    }
    const body: { clockIn?: string; clockOut?: string | null } = {};
    if (newClockIn !== selected.clockIn) body.clockIn = newClockIn;
    if (clockOutTime) body.clockOut = newClockOut;
    else if (selected.clockOut) body.clockOut = null;
    if (Object.keys(body).length === 0) { setSelected(null); return; }
    updateMutation.mutate(body);
  }

  // ── 수동 등록 모달 (OWNER/MANAGER) ──────────────────
  const { data: staffs = [] } = useStaffs(canManage ? currentStoreId : null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStaffId, setAddStaffId] = useState('');
  const [addClockIn, setAddClockIn] = useState('');
  const [addClockOut, setAddClockOut] = useState('');
  const [addReason, setAddReason] = useState('관리자 직접 등록');
  const [addError, setAddError] = useState('');

  const addMutation = useMutation({
    mutationFn: (body: object) =>
      api.post(`/stores/${currentStoreId}/attendance-requests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', currentStoreId, dateStr] });
      qc.invalidateQueries({ queryKey: ['attendance-requests', currentStoreId] });
      setAddOpen(false);
      setAddStaffId(''); setAddClockIn(''); setAddClockOut(''); setAddReason('관리자 직접 등록');
    },
    onError: (e: any) => setAddError(e.response?.data?.message ?? '등록에 실패했습니다.'),
  });

  function handleAdd() {
    if (!addStaffId || !addClockIn) {
      setAddError('직원과 출근 시간은 필수입니다.');
      return;
    }
    setAddError('');
    addMutation.mutate({
      staffId: addStaffId,
      requestedClockIn: todayKstTimeToUtc(addClockIn),
      requestedClockOut: addClockOut ? todayKstTimeToUtc(addClockOut) : null,
      reason: addReason || '관리자 직접 등록',
    });
  }

  // ── 요청 승인/거절 ─────────────────────────────────
  const [reviewTarget, setReviewTarget] = useState<AttendanceRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  function handleReview(req: AttendanceRequest, status: 'APPROVED' | 'REJECTED') {
    reviewMutation.mutate(
      { requestId: req.id, status, reviewNote: reviewNote || undefined },
      { onSuccess: () => { setReviewTarget(null); setReviewNote(''); } },
    );
  }

  const activeStaffs = staffs.filter((s) => s.leftAt === null);

  return (
    <>
      <Header
        title="출퇴근 관리"
        description={today}
        actions={
          canManage && (
            <Button size="sm" onClick={() => setAddOpen(true)}>+ 수동 등록</Button>
          )
        }
      />

      {/* 탭 */}
      <div className="flex gap-1 mb-5 border-b border-gray-100">
        {([
          { key: 'today',    label: '오늘 현황' },
          { key: 'requests', label: `수정 요청${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭: 오늘 현황 ── */}
      {tab === 'today' && (
        <>
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

          {loadingAtt ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : errAtt ? (
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
                          예정 {formatTime(a.schedule.startAt)} ~ {formatTime(a.schedule.endAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        출근 {formatTime(a.clockIn)}
                        {a.clockOut && ` · 퇴근 ${formatTime(a.clockOut)}`}
                      </p>
                      {(a as any).isAutoClockOut && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">자동퇴근</span>
                      )}
                    </div>
                    {canManage && <span className="text-gray-300 text-lg ml-1">›</span>}
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}

      {/* ── 탭: 수정 요청 ── */}
      {tab === 'requests' && canManage && (
        <>
          {loadingReq ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : requests.length === 0 ? (
            <Empty label="출퇴근 수정 요청이 없습니다" />
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const cfg = reqStatusConfig[req.status];
                return (
                  <Card key={req.id} padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 text-sm">
                            {req.staff.user.name}
                          </span>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          {req.attendanceId === null && (
                            <Badge variant="blue">신규 등록</Badge>
                          )}
                        </div>
                        {req.attendance && (
                          <p className="text-xs text-gray-400 mb-0.5">
                            기존: {formatTime(req.attendance.clockIn)}
                            {req.attendance.clockOut && ` ~ ${formatTime(req.attendance.clockOut)}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          요청: {formatTime(req.requestedClockIn)}
                          {req.requestedClockOut && ` ~ ${formatTime(req.requestedClockOut)}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 truncate">사유: {req.reason}</p>
                        <p className="text-xs text-gray-300 mt-0.5">
                          {format(new Date(req.createdAt), 'MM.dd HH:mm')} · {req.requestedBy.name} 요청
                        </p>
                        {req.reviewNote && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">
                            처리 메모: {req.reviewNote}
                          </p>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => { setReviewTarget(req); setReviewNote(''); }}
                            disabled={reviewMutation.isPending}
                          >
                            처리
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 수동 수정 모달 ── */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="출퇴근 시간 수정" size="sm">
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
                <input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  퇴근 시간 <span className="text-xs text-gray-400">(KST · 미입력 시 근무 중)</span>
                </label>
                <input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {clockOutTime && (
                  <button type="button" onClick={() => setClockOutTime('')}
                    className="text-xs text-gray-400 hover:text-red-500 mt-1">
                    퇴근 시간 제거
                  </button>
                )}
              </div>
            </div>
            {editError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>취소</Button>
              <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending || !clockInTime}>
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 수동 등록 모달 ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="출퇴근 수동 등록" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">오너/매니저가 직접 등록하면 즉시 반영됩니다.</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">직원 선택</label>
            <select value={addStaffId} onChange={(e) => setAddStaffId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">직원을 선택하세요</option>
              {activeStaffs.map((s) => (
                <option key={s.id} value={s.id}>{s.user.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">출근 시간 (KST)</label>
              <input type="time" value={addClockIn} onChange={(e) => setAddClockIn(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">퇴근 시간 (KST, 선택)</label>
              <input type="time" value={addClockOut} onChange={(e) => setAddClockOut(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">사유</label>
            <input type="text" value={addReason} onChange={(e) => setAddReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="관리자 직접 등록" />
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>취소</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── 요청 처리 모달 ── */}
      {reviewTarget && (
        <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="요청 처리" size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-gray-800">{reviewTarget.staff.user.name}</p>
              {reviewTarget.attendance && (
                <p className="text-gray-400">
                  기존: {formatTime(reviewTarget.attendance.clockIn)}
                  {reviewTarget.attendance.clockOut && ` ~ ${formatTime(reviewTarget.attendance.clockOut)}`}
                </p>
              )}
              <p className="text-gray-700">
                요청: {formatTime(reviewTarget.requestedClockIn)}
                {reviewTarget.requestedClockOut && ` ~ ${formatTime(reviewTarget.requestedClockOut)}`}
              </p>
              <p className="text-gray-400">사유: {reviewTarget.reason}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">처리 메모 (선택)</label>
              <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="확인했습니다." />
            </div>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" onClick={() => handleReview(reviewTarget, 'REJECTED')}
                disabled={reviewMutation.isPending}>
                거절
              </Button>
              <Button className="flex-1" onClick={() => handleReview(reviewTarget, 'APPROVED')}
                disabled={reviewMutation.isPending}>
                승인
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
