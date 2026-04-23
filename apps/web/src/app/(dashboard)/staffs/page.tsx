'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Header } from '@/components/layout';
import { Button, Avatar, Badge, Card, Empty, Spinner, Modal } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useStaffs, type Staff } from '@/hooks/useStaffs';
import { api } from '@/lib/api';

const roleMap = {
  OWNER:   { label: '오너',   variant: 'purple' as const },
  MANAGER: { label: '매니저', variant: 'blue'   as const },
  STAFF:   { label: '알바생', variant: 'gray'   as const },
};

export default function StaffsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'재직중' | '퇴직'>('재직중');
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const { data: staffs = [], isLoading, error } = useStaffs(currentStoreId);

  // ── 직원 상세 모달 ─────────────────────────────────
  const [selected, setSelected] = useState<Staff | null>(null);
  const [wage, setWage] = useState('');
  const [wageError, setWageError] = useState('');

  function handleOpenDetail(staff: Staff) {
    setSelected(staff);
    setWage(String(staff.hourlyWage));
    setWageError('');
  }

  const updateMutation = useMutation({
    mutationFn: (body: { hourlyWage?: number; leftAt?: string | null }) =>
      api.patch(`/stores/${currentStoreId}/staffs/${selected!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffs', currentStoreId] });
      setSelected(null);
    },
  });

  function handleSaveWage() {
    const parsed = parseInt(wage, 10);
    if (isNaN(parsed) || parsed < 0) {
      setWageError('올바른 시급을 입력해주세요.');
      return;
    }
    setWageError('');
    updateMutation.mutate({ hourlyWage: parsed });
  }

  function handleResign() {
    if (!window.confirm(`${selected?.user.name}님을 퇴직 처리하시겠습니까?`)) return;
    updateMutation.mutate({ leftAt: new Date().toISOString() });
  }

  // ── 초대 모달 ─────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/stores/${currentStoreId}/invite`).then((r) => r.data),
    onSuccess: (data) => { setInviteCode(data.code); setCopied(false); },
  });

  function handleOpenInvite() {
    setInviteCode('');
    setCopied(false);
    setInviteOpen(true);
    inviteMutation.mutate();
  }

  function handleCopy() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filtered = staffs.filter((s) =>
    filter === '재직중' ? s.leftAt === null : s.leftAt !== null,
  );

  return (
    <>
      <Header
        title="알바생 관리"
        actions={<Button size="sm" onClick={handleOpenInvite}>+ 초대하기</Button>}
      />

      <div className="flex gap-2 mb-4">
        {(['재직중', '퇴직'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <Empty label="데이터를 불러오지 못했습니다" />
      ) : filtered.length === 0 ? (
        <Empty label={filter === '재직중' ? '재직 중인 알바생이 없습니다' : '퇴직한 알바생이 없습니다'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((staff) => {
            const role = roleMap[staff.role];
            return (
              <Card
                key={staff.id}
                hover
                padding="md"
                onClick={() => handleOpenDetail(staff)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <Avatar name={staff.user.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900">{staff.user.name}</span>
                      <Badge variant={role.variant}>{role.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      시급 {staff.hourlyWage.toLocaleString()}원
                      {staff.user.phone ? ` · ${staff.user.phone}` : ''}
                    </p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 직원 상세 모달 */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="직원 상세"
          size="sm"
        >
          <div className="space-y-5">
            {/* 기본 정보 */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <Avatar name={selected.user.name} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-base">{selected.user.name}</span>
                  <Badge variant={roleMap[selected.role].variant}>{roleMap[selected.role].label}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selected.user.email}</p>
                {selected.user.phone && (
                  <p className="text-xs text-gray-400">{selected.user.phone}</p>
                )}
              </div>
            </div>

            {/* 근무 정보 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">입사일</p>
                <p className="font-medium text-gray-700">
                  {format(new Date(selected.joinedAt), 'yyyy.MM.dd', { locale: ko })}
                </p>
              </div>
              {selected.leftAt && (
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">퇴직일</p>
                  <p className="font-medium text-gray-700">
                    {format(new Date(selected.leftAt), 'yyyy.MM.dd', { locale: ko })}
                  </p>
                </div>
              )}
            </div>

            {/* 시급 수정 (OWNER/MANAGER만) */}
            {canManage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">시급 수정</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={wage}
                      onChange={(e) => { setWage(e.target.value); setWageError(''); }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        wageError ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="시급 (원)"
                      min={0}
                    />
                    {wageError && <p className="text-xs text-red-500 mt-1">{wageError}</p>}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveWage}
                    disabled={updateMutation.isPending || String(selected.hourlyWage) === wage}
                  >
                    저장
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  현재: {selected.hourlyWage.toLocaleString()}원
                </p>
              </div>
            )}

            {/* 퇴직 처리 (재직중인 STAFF/MANAGER만, OWNER 제외) */}
            {canManage && selected.leftAt === null && selected.role !== 'OWNER' && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">퇴직 처리하면 출근 기록이 중단되고 되돌릴 수 없습니다.</p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleResign}
                  disabled={updateMutation.isPending}
                >
                  퇴직 처리
                </Button>
              </div>
            )}

            {updateMutation.isError && (
              <p className="text-xs text-red-500 text-center">
                {(updateMutation.error as any)?.response?.data?.message ?? '처리에 실패했습니다.'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* 초대 코드 모달 */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="알바생 초대" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            아래 코드를 알바생에게 공유하세요. 코드는 <strong>24시간</strong> 동안 유효합니다.
          </p>
          {inviteMutation.isPending ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : inviteCode ? (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-center">
                <p className="text-2xl font-bold text-primary-600 tracking-widest">{inviteCode}</p>
              </div>
              <Button variant={copied ? 'secondary' : 'primary'} className="w-full" onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '코드 복사'}
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
                새 코드 발급
              </Button>
            </>
          ) : inviteMutation.isError ? (
            <p className="text-sm text-red-500 text-center">코드 발급에 실패했습니다.</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
