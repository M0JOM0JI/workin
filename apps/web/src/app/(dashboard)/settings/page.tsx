'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout';
import { Card, Button, Input, Spinner, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

type AutoClockOutMode = 'MIDNIGHT' | 'MAX_HOURS' | 'SCHEDULE';

interface StoreDetail {
  id: string;
  name: string;
  businessOwner?: string | null;
  businessNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  category?: string | null;
  // 급여 설정
  payDay?: number | null;
  // 자동 퇴근
  autoClockOut?: boolean;
  autoClockOutMode?: AutoClockOutMode;
  autoClockOutBuffer?: number;
  autoClockOutMaxHours?: number;
  // 수당 설정
  nightShiftEnabled?: boolean;
  nightShiftMultiplier?: number;
  overtimeEnabled?: boolean;
  overtimeMultiplier?: number;
}

const BASIC_FIELDS: { key: keyof Omit<StoreDetail, 'id'>; label: string; placeholder: string }[] = [
  { key: 'name',           label: '매장명',           placeholder: '예: 스타벅스 강남점' },
  { key: 'businessOwner',  label: '사업자명',          placeholder: '예: 홍길동' },
  { key: 'businessNumber', label: '사업자번호',        placeholder: '예: 123-45-67890' },
  { key: 'address',        label: '주소',              placeholder: '도로명 주소' },
  { key: 'phone',          label: '매장 전화번호',     placeholder: '예: 02-1234-5678' },
  { key: 'mobilePhone',    label: '담당자 휴대폰번호', placeholder: '예: 010-1234-5678' },
  { key: 'category',       label: '업종',              placeholder: '예: 카페, 편의점' },
];

const MODE_LABELS: Record<AutoClockOutMode, string> = {
  MIDNIGHT:  '자정 (당일 KST 00:00)',
  MAX_HOURS: '최대 근무시간 초과 시',
  SCHEDULE:  '스케줄 종료 후 N분',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-4">{children}</h3>;
}

function ToggleRow({
  label, description, checked, onChange, disabled,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { currentStoreId, clearAuth, setStores } = useAuthStore();
  const myRole = useAuthStore((s) =>
    s.stores.find((st) => st.store.id === s.currentStoreId)?.role ?? null,
  );
  const isOwner = myRole === 'OWNER';

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', currentStoreId],
    queryFn: async () => {
      const { data } = await api.get(`/stores/${currentStoreId}`);
      return data as StoreDetail;
    },
    enabled: !!currentStoreId,
  });

  // ── 기본 정보 폼 ──────────────────────────────────────────
  const [form, setForm] = useState<Record<string, string>>({
    name: '', businessOwner: '', businessNumber: '',
    address: '', phone: '', mobilePhone: '', category: '',
  });
  const [savedBasic, setSavedBasic] = useState(false);

  // ── 급여 설정 폼 ──────────────────────────────────────────
  const [payDay, setPayDay] = useState<string>('');
  const [savedPay, setSavedPay] = useState(false);

  // ── 자동퇴근 설정 폼 ──────────────────────────────────────
  const [autoClockOut, setAutoClockOut] = useState(false);
  const [autoMode, setAutoMode] = useState<AutoClockOutMode>('MIDNIGHT');
  const [autoBuffer, setAutoBuffer] = useState('30');
  const [autoMaxHours, setAutoMaxHours] = useState('12');
  const [savedAuto, setSavedAuto] = useState(false);

  // ── 수당 설정 폼 ──────────────────────────────────────────
  const [nightEnabled, setNightEnabled] = useState(false);
  const [nightMultiplier, setNightMultiplier] = useState('1.5');
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5');
  const [savedAllowance, setSavedAllowance] = useState(false);

  useEffect(() => {
    if (!store) return;
    setForm({
      name:           store.name ?? '',
      businessOwner:  store.businessOwner ?? '',
      businessNumber: store.businessNumber ?? '',
      address:        store.address ?? '',
      phone:          store.phone ?? '',
      mobilePhone:    store.mobilePhone ?? '',
      category:       store.category ?? '',
    });
    setPayDay(String(store.payDay ?? ''));
    setAutoClockOut(store.autoClockOut ?? false);
    setAutoMode(store.autoClockOutMode ?? 'MIDNIGHT');
    setAutoBuffer(String(store.autoClockOutBuffer ?? 30));
    setAutoMaxHours(String(store.autoClockOutMaxHours ?? 12));
    setNightEnabled(store.nightShiftEnabled ?? false);
    setNightMultiplier(String(store.nightShiftMultiplier ?? 1.5));
    setOvertimeEnabled(store.overtimeEnabled ?? false);
    setOvertimeMultiplier(String(store.overtimeMultiplier ?? 1.5));
  }, [store]);

  // ── Mutations ──────────────────────────────────────────────
  const patchStore = (payload: Record<string, unknown>, onDone: () => void) =>
    api.patch(`/stores/${currentStoreId}`, payload).then(onDone);

  const basicMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | null> = {};
      BASIC_FIELDS.forEach(({ key }) => {
        payload[key as string] = (form[key as string] ?? '').trim() || null;
      });
      return patchStore(payload, async () => {
        qc.invalidateQueries({ queryKey: ['store', currentStoreId] });
        const { data: stores } = await api.get('/stores');
        setStores(stores);
        setSavedBasic(true);
        setTimeout(() => setSavedBasic(false), 2000);
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      patchStore({ payDay: payDay ? Number(payDay) : null }, () => {
        qc.invalidateQueries({ queryKey: ['store', currentStoreId] });
        setSavedPay(true);
        setTimeout(() => setSavedPay(false), 2000);
      }),
  });

  const autoMutation = useMutation({
    mutationFn: () =>
      patchStore({
        autoClockOut,
        autoClockOutMode: autoMode,
        autoClockOutBuffer: Number(autoBuffer),
        autoClockOutMaxHours: Number(autoMaxHours),
      }, () => {
        qc.invalidateQueries({ queryKey: ['store', currentStoreId] });
        setSavedAuto(true);
        setTimeout(() => setSavedAuto(false), 2000);
      }),
  });

  const allowanceMutation = useMutation({
    mutationFn: () =>
      patchStore({
        nightShiftEnabled: nightEnabled,
        nightShiftMultiplier: Number(nightMultiplier),
        overtimeEnabled,
        overtimeMultiplier: Number(overtimeMultiplier),
      }, () => {
        qc.invalidateQueries({ queryKey: ['store', currentStoreId] });
        setSavedAllowance(true);
        setTimeout(() => setSavedAllowance(false), 2000);
      }),
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

  if (isLoading) {
    return (
      <>
        <Header title="매장 설정" />
        <div className="flex justify-center py-12"><Spinner /></div>
      </>
    );
  }

  return (
    <>
      <Header title="매장 설정" />

      {/* 매니저 읽기 전용 안내 */}
      {!isOwner && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
          <span className="text-yellow-600 text-sm">⚠</span>
          <p className="text-sm text-yellow-700">
            매니저 계정은 설정을 <strong>조회만</strong> 가능합니다. 수정은 오너에게 문의하세요.
          </p>
        </div>
      )}

      <div className="max-w-xl space-y-4">

        {/* ── 기본 정보 ── */}
        <Card padding="lg">
          <SectionTitle>매장 정보</SectionTitle>
          <div className="space-y-3">
            {BASIC_FIELDS.map(({ key, label, placeholder }) => (
              <Input
                key={key as string}
                label={label}
                placeholder={placeholder}
                value={form[key as string] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  isOwner && setForm({ ...form, [key as string]: e.target.value })
                }
                disabled={!isOwner}
              />
            ))}
          </div>
          {isOwner && (
            <Button
              className="mt-4"
              size="md"
              onClick={() => basicMutation.mutate()}
              disabled={basicMutation.isPending}
            >
              {basicMutation.isPending ? '저장 중...' : savedBasic ? '✓ 저장됨' : '저장'}
            </Button>
          )}
        </Card>

        {/* ── 급여 설정 ── */}
        <Card padding="lg">
          <SectionTitle>급여 설정</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                급여일 (매월 N일)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={payDay}
                  onChange={(e) => isOwner && setPayDay(e.target.value)}
                  disabled={!isOwner}
                  placeholder="예: 25"
                  className="w-24 h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <span className="text-sm text-gray-400">일</span>
                {payDay && (
                  <Badge variant="blue">매월 {payDay}일</Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">급여 화면에 D-N 카운트다운이 표시됩니다.</p>
            </div>
          </div>
          {isOwner && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
            >
              {payMutation.isPending ? '저장 중...' : savedPay ? '✓ 저장됨' : '저장'}
            </Button>
          )}
        </Card>

        {/* ── 자동 퇴근 설정 ── */}
        <Card padding="lg">
          <SectionTitle>자동 퇴근 설정</SectionTitle>
          <div className="space-y-3">
            <ToggleRow
              label="자동 퇴근 활성화"
              description="미퇴근 알바생을 자동으로 퇴근 처리합니다 (5분마다 검사)."
              checked={autoClockOut}
              onChange={setAutoClockOut}
              disabled={!isOwner}
            />

            {autoClockOut && (
              <div className="pl-2 space-y-3 border-l-2 border-primary-100">
                {/* 모드 선택 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">퇴근 처리 기준</label>
                  <div className="space-y-1.5">
                    {(Object.keys(MODE_LABELS) as AutoClockOutMode[]).map((mode) => (
                      <label key={mode} className={`flex items-center gap-2.5 cursor-pointer ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="radio"
                          name="autoMode"
                          value={mode}
                          checked={autoMode === mode}
                          onChange={() => isOwner && setAutoMode(mode)}
                          disabled={!isOwner}
                          className="accent-primary-600"
                        />
                        <span className="text-sm text-gray-700">{MODE_LABELS[mode]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SCHEDULE 모드: 버퍼(분) 입력 */}
                {autoMode === 'SCHEDULE' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      스케줄 종료 후 버퍼 (분)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={240}
                        value={autoBuffer}
                        onChange={(e) => isOwner && setAutoBuffer(e.target.value)}
                        disabled={!isOwner}
                        className="w-24 h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                      <span className="text-sm text-gray-400">분 후 자동 퇴근</span>
                    </div>
                  </div>
                )}

                {/* MAX_HOURS 모드: 최대 시간 입력 */}
                {autoMode === 'MAX_HOURS' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      최대 근무시간
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={autoMaxHours}
                        onChange={(e) => isOwner && setAutoMaxHours(e.target.value)}
                        disabled={!isOwner}
                        className="w-24 h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                      <span className="text-sm text-gray-400">시간 초과 시 자동 퇴근</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {isOwner && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending}
            >
              {autoMutation.isPending ? '저장 중...' : savedAuto ? '✓ 저장됨' : '저장'}
            </Button>
          )}
        </Card>

        {/* ── 수당 설정 ── */}
        <Card padding="lg">
          <SectionTitle>수당 설정</SectionTitle>
          <div className="space-y-4">
            {/* 야간 수당 */}
            <div className="space-y-2">
              <ToggleRow
                label="야간수당 활성화"
                description="KST 22:00~06:00 근무분에 추가 수당을 적용합니다."
                checked={nightEnabled}
                onChange={setNightEnabled}
                disabled={!isOwner}
              />
              {nightEnabled && (
                <div className="pl-2 flex items-center gap-2 border-l-2 border-primary-100">
                  <label className="text-xs text-gray-500 w-20">배율</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={nightMultiplier}
                    onChange={(e) => isOwner && setNightMultiplier(e.target.value)}
                    disabled={!isOwner}
                    className="w-24 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                  <span className="text-xs text-gray-400">배 (예: 1.5 → 시급의 150%)</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* 초과 수당 */}
            <div className="space-y-2">
              <ToggleRow
                label="초과근무수당 활성화"
                description="스케줄 종료 후 초과 근무분에 추가 수당을 적용합니다."
                checked={overtimeEnabled}
                onChange={setOvertimeEnabled}
                disabled={!isOwner}
              />
              {overtimeEnabled && (
                <div className="pl-2 flex items-center gap-2 border-l-2 border-primary-100">
                  <label className="text-xs text-gray-500 w-20">배율</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={overtimeMultiplier}
                    onChange={(e) => isOwner && setOvertimeMultiplier(e.target.value)}
                    disabled={!isOwner}
                    className="w-24 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                  <span className="text-xs text-gray-400">배 (예: 1.5 → 시급의 150%)</span>
                </div>
              )}
            </div>
          </div>
          {isOwner && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => allowanceMutation.mutate()}
              disabled={allowanceMutation.isPending}
            >
              {allowanceMutation.isPending ? '저장 중...' : savedAllowance ? '✓ 저장됨' : '저장'}
            </Button>
          )}
        </Card>

        {/* ── 위험 구역 (OWNER 전용) ── */}
        {isOwner && (
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
        )}
      </div>
    </>
  );
}
