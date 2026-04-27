'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';
import { Modal, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const navItems = [
  { href: '/dashboard',   label: '대시보드',   icon: '▦' },
  { href: '/schedules',   label: '스케줄',     icon: '📅' },
  { href: '/staffs',      label: '알바생',     icon: '👥' },
  { href: '/attendance',  label: '출근 현황',  icon: '✅' },
  { href: '/payroll',     label: '급여 관리',  icon: '💰' },
  { href: '/statistics',  label: '근무 통계',  icon: '📊' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, stores, currentStoreId, setCurrentStoreId, setStores, clearAuth } = useAuthStore();

  const currentStore = stores.find((s) => s.store.id === currentStoreId)?.store
    ?? stores[0]?.store;

  // 현재 유저의 역할 (현재 매장 기준)
  const myRole = stores.find((s) => s.store.id === currentStoreId)?.role ?? null;
  const isOwner = myRole === 'OWNER';

  // 매장 추가 모달
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', businessOwner: '', businessNumber: '',
    address: '', phone: '', mobilePhone: '', category: '',
  });
  const [formError, setFormError] = useState('');

  const createStoreMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {};
      Object.entries(form).forEach(([k, v]) => { if (v.trim()) payload[k] = v.trim(); });
      return api.post('/stores', payload);
    },
    onSuccess: async () => {
      const { data: newStores } = await api.get('/stores');
      setStores(newStores);
      // 새로 만든 매장을 currentStore로 설정
      const latest = newStores[newStores.length - 1];
      if (latest) setCurrentStoreId(latest.store.id);
      setAddOpen(false);
      setForm({ name: '', businessOwner: '', businessNumber: '', address: '', phone: '', mobilePhone: '', category: '' });
    },
    onError: (e: any) => {
      setFormError(e.response?.data?.message ?? '매장 생성에 실패했습니다.');
    },
  });

  function handleOpenAdd() {
    setForm({ name: '', businessOwner: '', businessNumber: '', address: '', phone: '', mobilePhone: '', category: '' });
    setFormError('');
    setAddOpen(true);
  }

  function handleLogout() {
    clearAuth();
    localStorage.removeItem('accessToken');
    router.push('/auth/login');
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <span className="text-xl font-bold text-primary-600 tracking-tight">Workin</span>
      </div>

      {/* 매장 선택 + 추가 */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-1.5">
        {stores.length > 1 ? (
          <select
            value={currentStoreId ?? ''}
            onChange={(e) => setCurrentStoreId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-gray-700 bg-gray-50 border border-gray-100 focus:outline-none cursor-pointer"
          >
            {stores.map((s) => (
              <option key={s.store.id} value={s.store.id}>
                {s.store.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {currentStore?.name ?? '매장 없음'}
            </span>
          </div>
        )}

        {/* 매장 추가 버튼 — OWNER만 노출 */}
        {isOwner && (
          <button
            onClick={handleOpenAdd}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-primary-600 hover:bg-primary-50 transition-colors font-medium"
          >
            <span>+</span>
            <span>매장 추가</span>
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto w-1 h-4 rounded-full bg-primary-500" />}
            </Link>
          );
        })}
      </nav>

      {/* 설정 / 프로필 */}
      <div className="p-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span className="text-base w-5 text-center">⚙</span>
          매장 설정
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span className="text-base w-5 text-center">👤</span>
          {user?.name ?? '프로필'} · 로그아웃
        </button>
      </div>

      {/* 매장 추가 모달 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="새 매장 추가">
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}
          {[
            { key: 'name',           label: '매장명 *',         placeholder: '예: 스타벅스 강남점' },
            { key: 'businessOwner',  label: '사업자명 *',        placeholder: '예: 홍길동' },
            { key: 'businessNumber', label: '사업자번호 *',      placeholder: '예: 123-45-67890' },
            { key: 'address',        label: '주소',              placeholder: '도로명 주소' },
            { key: 'phone',          label: '매장 전화번호',     placeholder: '예: 02-1234-5678' },
            { key: 'mobilePhone',    label: '담당자 휴대폰번호', placeholder: '예: 010-1234-5678' },
            { key: 'category',       label: '업종',              placeholder: '예: 카페, 편의점' },
          ].map(({ key, label, placeholder }) => (
            <Input
              key={key}
              label={label}
              placeholder={placeholder}
              value={(form as Record<string, string>)[key]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, [key]: e.target.value })
              }
            />
          ))}
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button
              className="flex-1"
              disabled={!form.name.trim() || createStoreMutation.isPending}
              onClick={() => createStoreMutation.mutate()}
            >
              {createStoreMutation.isPending ? '생성 중...' : '매장 추가'}
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
