'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { currentStoreId, clearAuth, setStores } = useAuthStore();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', currentStoreId],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${currentStoreId}`);
      return data as { id: string; name: string; address?: string; category?: string };
    },
    enabled: !!currentStoreId,
  });

  const [form, setForm] = useState({ name: '', address: '', category: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (store) setForm({ name: store.name, address: store.address ?? '', category: store.category ?? '' });
  }, [store]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/stores/${currentStoreId}`, form),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['store', currentStoreId] });
      const { data: stores } = await api.get('/stores');
      setStores(stores);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/stores/${currentStoreId}`),
    onSuccess: async () => {
      const { data: stores } = await api.get('/stores');
      setStores(stores);
      if (stores.length === 0) {
        clearAuth();
        router.push('/auth/login');
      } else {
        router.push('/dashboard');
      }
    },
  });

  function handleDelete() {
    if (!window.confirm('매장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    deleteMutation.mutate();
  }

  return (
    <>
      <Header title="매장 설정" />
      <div className="max-w-xl space-y-4">
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">매장 정보</h3>
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <div className="space-y-3">
              <Input
                label="매장명"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
              <Input
                label="주소"
                value={form.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, address: e.target.value })
                }
              />
              <Input
                label="업종"
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, category: e.target.value })
                }
              />
            </div>
          )}
          <Button
            className="mt-4"
            size="md"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
          </Button>
        </Card>

        <Card padding="lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">위험 구역</h3>
          <p className="text-xs text-gray-400 mb-4">삭제된 매장은 복구할 수 없습니다.</p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '삭제 중...' : '매장 삭제'}
          </Button>
        </Card>
      </div>
    </>
  );
}
