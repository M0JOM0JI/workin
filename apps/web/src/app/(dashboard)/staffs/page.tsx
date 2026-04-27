'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Header } from '@/components/layout';
import { Button, Avatar, Badge, Card, Empty, Spinner, Modal } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useStaffs, type Staff, type InsuranceType } from '@/hooks/useStaffs';
import { api } from '@/lib/api';

const roleMap = {
  OWNER:   { label: '오너',   variant: 'purple' as const },
  MANAGER: { label: '매니저', variant: 'blue'   as const },
  STAFF:   { label: '알바생', variant: 'gray'   as const },
};

const insuranceLabels: Record<InsuranceType, string> = {
  NONE:        '미가입',
  FOUR_MAJOR:  '4대보험',
  THREE_THREE: '3.3% 원천징수',
};

export default function StaffsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'재직중' | '퇴직'>('재직중');
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const isOwner = myRole === 'OWNER';
  const canManage = myRole === 'OWNER' || myRole === 'MANAGER';

  const { data: staffs = [], isLoading, error } = useStaffs(currentStoreId);

  // ── 직원 상세 모달 ─────────────────────────────────
  const [selected, setSelected] = useState<Staff | null>(null);
  const [wage, setWage] = useState('');
  const [wageError, setWageError] = useState('');
  const [contractHours, setContractHours] = useState('');
  const [insurance, setInsurance] = useState<InsuranceType>('NONE');
  const [memo, setMemo] = useState('');

  function handleOpenDetail(staff: Staff) {
    setSelected(staff);
    setWage(String(staff.hourlyWage));
    setWageError('');
    setContractHours(staff.contractHoursPerMonth != null ? String(staff.contractHoursPerMonth) : '');
    setInsurance(staff.insuranceType ?? 'NONE');
    setMemo(staff.memo ?? '');
  }

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch(`/stores/${currentStoreId}/staffs/${selected!.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffs', currentStoreId] });
      setSelected(null);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: string }) =>
      api.patch(`/stores/${currentStoreId}/staffs/${staffId}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffs', currentStoreId] });
      setSelected(null);
    },
  });

  const rehireMutation = useMutation({
    mutationFn: (staffId: string) =>
      api.post(`/stores/${currentStoreId}/staffs/${staffId}/rehire`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffs', currentStoreId] });
      setSelected(null);
    },
  });

  function handleSaveStaff() {
    const parsedWage = parseInt(wage, 10);
    if (isNaN(parsedWage) || parsedWage < 0) {
      setWageError('올바른 시급을 입력해주세요.');
      return;
    }
    setWageError('');
    const parsedHours = contractHours !== '' ? parseInt(contractHours, 10) : null;
    updateMutation.mutate({
      hourlyWage: parsedWage,
      contractHoursPerMonth: parsedHours,
      insuranceType: insurance,
      memo: memo || null,
    });
  }

  function handleResign() {
    if (!window.confirm(`${selected?.user.name}님을 퇴직 처리하시겠습니까?`)) return;
    updateMutation.mutate({ leftAt: new Date().toISOString() });
  }

  function handleRehire() {
    if (!selected) return;
    if (!window.confirm(`${selected.user.name}님을 재고용하시겠습니까?`)) return;
    rehireMutation.mutate(selected.id);
  }

  function handlePromote() {
    if (!selected) return;
    const newRole = selected.role === 'STAFF' ? 'MANAGER' : null;
    if (!newRole) return;
    if (!window.confirm(`${selected.user.name}님을 매니저로 승격하시겠습니까?`)) return;
    roleMutation.mutate({ staffId: selected.id, role: newRole });
  }

  function handleDemote() {
    if (!selected) return;
    const newRole = selected.role === 'MANAGER' ? 'STAFF' : null;
    if (!newRole) return;
    if (!window.confirm(`${selected.user.name}님을 알바생으로 강등하시겠습니까?`)) return;
    roleMutation.mutate({ staffId: selected.id, role: newRole });
  }

  // ── 초대 모달 ─────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'MANAGER'>('STAFF');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: (role: string) =>
      api.post(`/stores/${currentStoreId}/invite`, { role }).then((r) => r.data),
    onSuccess: (data) => { setInviteCode(data.code); setCopied(false); },
  });

  function handleOpenInvite() {
    setInviteCode('');
    setCopied(false);
    setInviteRole('STAFF');
    setInviteOpen(true);
  }

  function handleIssueCode() {
    inviteMutation.mutate(inviteRole);
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

  const isPending = updateMutation.isPending || roleMutation.isPending || rehireMutation.isPending;

  return (
    <>
      <Header
        title="알바생 관리"
        actions={canManage && <Button size="sm" onClick={handleOpenInvite}>+ 초대하기</Button>}
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

            {/* 계약 정보 수정 (OWNER/MANAGER만) */}
            {canManage && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">계약 정보</p>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">시급 (원)</label>
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

                <div>
                  <label className="block text-xs text-gray-500 mb-1">월 계약 근무시간 (시간, 선택)</label>
                  <input
                    type="number"
                    value={contractHours}
                    onChange={(e) => setContractHours(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="예: 160"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">보험 유형</label>
                  <select
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value as InsuranceType)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {(Object.entries(insuranceLabels) as [InsuranceType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">메모 (내부용)</label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="화요일 수업 있음 등..."
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleSaveStaff}
                  disabled={isPending}
                >
                  저장
                </Button>
              </div>
            )}

            {/* 역할 변경 (OWNER만, 상대가 OWNER가 아닌 경우) */}
            {isOwner && selected.leftAt === null && selected.role !== 'OWNER' && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">역할 관리</p>
                <div className="flex gap-2">
                  {selected.role === 'STAFF' && (
                    <Button size="sm" variant="secondary" onClick={handlePromote} disabled={isPending}>
                      매니저로 승격
                    </Button>
                  )}
                  {selected.role === 'MANAGER' && (
                    <Button size="sm" variant="secondary" onClick={handleDemote} disabled={isPending}>
                      알바생으로 강등
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 퇴직 처리 / 재고용 */}
            {canManage && selected.role !== 'OWNER' && (
              <div className="pt-2 border-t border-gray-100">
                {selected.leftAt === null ? (
                  <>
                    <p className="text-xs text-gray-400 mb-2">퇴직 처리하면 출근 체크가 중단됩니다.</p>
                    <Button variant="danger" size="sm" onClick={handleResign} disabled={isPending}>
                      퇴직 처리
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-2">재고용하면 재직 중으로 복귀됩니다.</p>
                    <Button variant="secondary" size="sm" onClick={handleRehire} disabled={isPending}>
                      재고용
                    </Button>
                  </>
                )}
              </div>
            )}

            {(updateMutation.isError || roleMutation.isError || rehireMutation.isError) && (
              <p className="text-xs text-red-500 text-center">
                {((updateMutation.error || roleMutation.error || rehireMutation.error) as any)?.response?.data?.message ?? '처리에 실패했습니다.'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* 초대 코드 모달 */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="직원 초대" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            초대할 역할을 선택하고 코드를 발급하세요. 코드는 <strong>24시간</strong> 동안 유효합니다.
          </p>

          {/* 역할 선택 (오너만 매니저 초대 가능) */}
          <div className="flex gap-2">
            {(['STAFF', ...(isOwner ? ['MANAGER'] : [])] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setInviteRole(r as 'STAFF' | 'MANAGER'); setInviteCode(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  inviteRole === r
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {r === 'STAFF' ? '알바생' : '매니저'}
              </button>
            ))}
          </div>

          <Button className="w-full" onClick={handleIssueCode} disabled={inviteMutation.isPending}>
            코드 발급
          </Button>

          {inviteMutation.isPending ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : inviteCode ? (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-center">
                <p className="text-xs text-gray-400 mb-1">{inviteRole === 'STAFF' ? '알바생' : '매니저'} 초대 코드</p>
                <p className="text-2xl font-bold text-primary-600 tracking-widest">{inviteCode}</p>
              </div>
              <Button variant={copied ? 'secondary' : 'primary'} className="w-full" onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '코드 복사'}
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
