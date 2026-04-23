'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function SignupForm() {
  const router = useRouter();
  const { setAuth, setStores } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name     = '이름을 입력해주세요.';
    if (!form.email)              e.email    = '이메일을 입력해주세요.';
    if (form.password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다.';
    if (form.phone && !/^010-\d{4}-\d{4}$/.test(form.phone))
      e.phone = '010-0000-0000 형식으로 입력해주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.phone) payload.phone = form.phone;

      const { data } = await api.post('/auth/signup', payload);
      localStorage.setItem('accessToken', data.accessToken);
      setAuth(data.user, data.accessToken);

      // 매장 목록 로드 (신규 가입은 빈 배열 → 온보딩)
      const { data: stores } = await api.get('/stores');
      setStores(stores);

      router.push(stores.length === 0 ? '/onboarding/store' : '/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? '회원가입에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  const field = (
    key: keyof typeof form,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          errors[key] ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
          {serverError}
        </div>
      )}

      {field('name',     '이름',     'text',     '홍길동')}
      {field('email',    '이메일',   'email',    'email@example.com')}
      {field('password', '비밀번호', 'password', '8자 이상')}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          휴대폰 번호 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="010-0000-0000"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.phone ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {loading ? '가입 중...' : '가입하기'}
      </button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{' '}
        <a href="/auth/login" className="text-primary-600 font-medium hover:underline">
          로그인
        </a>
      </p>
    </form>
  );
}
