'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/dashboard',   label: '대시보드',   icon: '▦' },
  { href: '/schedules',   label: '스케줄',     icon: '📅' },
  { href: '/staffs',      label: '알바생',     icon: '👥' },
  { href: '/attendance',  label: '출근 현황',  icon: '✅' },
  { href: '/payroll',     label: '급여 관리',  icon: '💰' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, stores, currentStoreId, setCurrentStoreId, clearAuth } = useAuthStore();

  const currentStore = stores.find((s) => s.store.id === currentStoreId)?.store
    ?? stores[0]?.store;

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

      {/* 매장 선택 */}
      <div className="px-4 py-3 border-b border-gray-100">
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
    </aside>
  );
}
