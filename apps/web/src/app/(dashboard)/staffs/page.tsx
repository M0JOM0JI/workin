'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Button, Avatar, Badge, Card, Empty, Spinner, Modal } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useStaffs } from '@/hooks/useStaffs';
import { api } from '@/lib/api';

const roleMap = {
  OWNER:   { label: '오너',   variant: 'purple' as const },
  MANAGER: { label: '매니저', variant: 'blue'   as const },
  STAFF:   { label: '알바생', variant: 'gray'   as const },
};

export default function StaffsPage() {
  const [filter, setFilter] = useState<'재직중' | '퇴직'>('재직중');
  const currentStoreId = useAuthStore((s) => s.currentStoreId);
  const { data: staffs = [], isLoading, error } = useStaffs(currentStoreId);

  // 초대 모달
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/stores/${currentStoreId}/invite`).then((r) => r.data),
    onSuccess: (data) => {
      setInviteCode(data.code);
      setCopied(false);
    },
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
              <Card key={staff.id} hover padding="md">
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
              <Button
                variant={copied ? 'secondary' : 'primary'}
                className="w-full"
                onClick={handleCopy}
              >
                {copied ? '✓ 복사됨' : '코드 복사'}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending}
              >
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
