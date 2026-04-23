'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function LoginForm() {
  const router = useRouter();
  const { setAuth, setStores } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. 로그인 → accessToken + user
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('accessToken', data.accessToken);
      setAuth(data.user, data.accessToken);

      // 2. 소속 매장 목록 로드
      const { data: stores } = await api.get('/stores');
      setStores(stores);

      router.push(stores.length === 0 ? '/onboarding/store' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="이메일을 입력하세요"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="비밀번호를 입력하세요"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{' '}
        <a href="/auth/signup" className="text-primary-600 font-medium hover:underline">
          회원가입
        </a>
      </p>
    </form>
  );
}
