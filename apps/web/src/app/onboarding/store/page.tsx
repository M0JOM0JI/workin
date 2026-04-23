'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const FIELDS = [
  { key: 'name',           label: '매장명',         placeholder: '예: 스타벅스 강남점', required: true  },
  { key: 'businessOwner',  label: '사업자명',        placeholder: '예: 홍길동',          required: true  },
  { key: 'businessNumber', label: '사업자번호',      placeholder: '예: 123-45-67890',    required: true  },
  { key: 'address',        label: '주소',            placeholder: '도로명 주소',         required: true  },
  { key: 'phone',          label: '매장 전화번호',   placeholder: '예: 02-1234-5678',    required: false },
  { key: 'mobilePhone',    label: '담당자 휴대폰번호', placeholder: '예: 010-1234-5678', required: false },
  { key: 'category',       label: '업종',            placeholder: '예: 카페, 편의점',    required: false },
] as const;

type FormKey = (typeof FIELDS)[number]['key'];

export default function OnboardingStorePage() {
  const router = useRouter();
  const { setStores, setCurrentStoreId } = useAuthStore();

  const [form, setForm] = useState<Record<FormKey, string>>({
    name: '', businessOwner: '', businessNumber: '',
    address: '', phone: '', mobilePhone: '', category: '',
  });
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [serverError, setServerError] = useState('');

  function validate() {
    const e: Partial<Record<FormKey, string>> = {};
    FIELDS.forEach(({ key, label, required }) => {
      if (required && !form[key].trim()) e[key] = `${label}을(를) 입력해주세요.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<Record<FormKey, string>> = {};
      FIELDS.forEach(({ key }) => { if (form[key].trim()) payload[key] = form[key].trim(); });
      return api.post('/stores', payload);
    },
    onSuccess: async () => {
      const { data: stores } = await api.get('/stores');
      setStores(stores);
      const latest = stores[stores.length - 1];
      if (latest) setCurrentStoreId(latest.store.id);
      router.replace('/dashboard');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? '매장 생성에 실패했습니다.'));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError('');
    mutation.mutate();
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 pb-16 px-4">
      <div className="w-full max-w-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-primary-600 tracking-tight">Workin</span>
          <p className="text-gray-500 mt-2 text-sm">서비스 이용을 위해 첫 매장을 등록해 주세요.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">매장 정보 입력</h2>

          {serverError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                  {required
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="text-gray-400 font-normal ml-1">(선택)</span>
                  }
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors[key] ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {errors[key] && (
                  <p className="text-xs text-red-500 mt-1">{errors[key]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full mt-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              {mutation.isPending ? '생성 중...' : '매장 등록하고 시작하기'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
