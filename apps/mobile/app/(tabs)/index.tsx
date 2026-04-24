import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatKRW, formatTime } from '@workin/utils';

function NoStoreScreen() {
  const { setCurrentStoreId } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const joinMutation = useMutation({
    mutationFn: () => api.post('/stores/join', { code: code.trim() }),
    onSuccess: async () => {
      const { data: stores } = await api.get('/stores');
      if (stores?.length > 0) {
        await setCurrentStoreId(stores[0].store.id);
      }
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? '유효하지 않은 초대 코드입니다.');
    },
  });

  return (
    <KeyboardAvoidingView
      style={noStoreStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={noStoreStyles.emoji}>🏪</Text>
      <Text style={noStoreStyles.title}>소속 매장이 없습니다</Text>
      <Text style={noStoreStyles.desc}>
        사장님께 초대 코드를 받아{'\n'}아래에 입력해 주세요.
      </Text>

      <View style={noStoreStyles.inputRow}>
        <TextInput
          style={noStoreStyles.input}
          placeholder="초대 코드 입력"
          value={code}
          onChangeText={(t) => { setCode(t); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[noStoreStyles.btn, (!code.trim() || joinMutation.isPending) && noStoreStyles.btnDisabled]}
          onPress={() => joinMutation.mutate()}
          disabled={!code.trim() || joinMutation.isPending}
        >
          <Text style={noStoreStyles.btnText}>
            {joinMutation.isPending ? '확인 중...' : '가입'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={noStoreStyles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

export default function HomeScreen() {
  const qc = useQueryClient();
  const { user, currentStoreId } = useAuthStore();

  // 소속 매장 없으면 온보딩 화면
  if (!currentStoreId) return <NoStoreScreen />;
  const today = format(new Date(), 'yyyy.MM.dd EEE', { locale: ko });
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yearMonth = format(new Date(), 'yyyy-MM');

  // 오늘 스케줄
  const { data: schedules = [] } = useQuery({
    queryKey: ['my-schedules-today', todayStr],
    queryFn: () =>
      api
        .get('/me/schedules', {
          params: {
            from: startOfDay(new Date()).toISOString(),
            to: endOfDay(new Date()).toISOString(),
          },
        })
        .then((r) => r.data),
    enabled: !!user,
  });

  // 오늘 출퇴근 기록
  const { data: attendances = [], isLoading: loadingAtt } = useQuery({
    queryKey: ['my-attendance-today', currentStoreId, todayStr],
    queryFn: () =>
      api
        .get(`/stores/${currentStoreId}/attendance`, { params: { date: todayStr } })
        .then((r) => r.data),
    enabled: !!currentStoreId,
    refetchInterval: 30_000,
  });

  // 이번달 내 급여
  const { data: payrollList = [] } = useQuery({
    queryKey: ['my-payroll', yearMonth],
    queryFn: () =>
      api.get('/me/payroll', { params: { yearMonth } }).then((r) => r.data),
    enabled: !!user,
  });
  const totalNet: number = payrollList.reduce((acc: number, r: any) => acc + (r.netPay ?? 0), 0);

  // 현재 로그인한 유저의 출퇴근 상태
  const myAttendance = attendances.find(
    (a: any) => a.staff?.user?.id === user?.id && !a.clockOut,
  );
  const isClockedIn = !!myAttendance;

  const clockInMutation = useMutation({
    mutationFn: () => api.post(`/stores/${currentStoreId}/attendance/clock-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance-today', currentStoreId, todayStr] });
      Alert.alert('출근 완료', '출근이 기록되었습니다. 오늘도 화이팅!');
    },
    onError: (err: any) =>
      Alert.alert('오류', err.response?.data?.message ?? '출근 체크에 실패했습니다.'),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => api.post(`/stores/${currentStoreId}/attendance/clock-out`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance-today', currentStoreId, todayStr] });
      Alert.alert('퇴근 완료', '수고하셨습니다!');
    },
    onError: (err: any) =>
      Alert.alert('오류', err.response?.data?.message ?? '퇴근 체크에 실패했습니다.'),
  });

  const todaySchedule: any = schedules[0];
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>안녕하세요, {user?.name ?? ''}님 👋</Text>
      <Text style={styles.date}>{today}</Text>

      {/* 오늘 스케줄 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘 스케줄</Text>
        {todaySchedule ? (
          <Text style={styles.scheduleTime}>
            {formatTime(todaySchedule.startAt)} ~ {formatTime(todaySchedule.endAt)}
          </Text>
        ) : (
          <Text style={styles.noSchedule}>오늘 스케줄이 없습니다</Text>
        )}
      </View>

      {/* 출퇴근 버튼 */}
      {loadingAtt ? (
        <View style={[styles.clockButton, styles.clockButtonDisabled]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.clockButton,
            isClockedIn ? styles.clockOutButton : styles.clockInButton,
            isPending && styles.clockButtonDisabled,
          ]}
          onPress={() =>
            isClockedIn ? clockOutMutation.mutate() : clockInMutation.mutate()
          }
          disabled={isPending}
        >
          <Text style={styles.clockButtonText}>
            {isPending ? '처리 중...' : isClockedIn ? '퇴근하기' : '출근하기'}
          </Text>
          {isClockedIn && myAttendance?.clockIn && (
            <Text style={styles.clockSubText}>
              출근 {formatTime(myAttendance.clockIn)}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* 이번달 예상 급여 */}
      <View style={styles.payrollCard}>
        <Text style={styles.payrollLabel}>이번달 예상 급여</Text>
        <Text style={styles.payrollAmount}>{formatKRW(totalNet)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20, paddingTop: 60 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  date: { color: '#6b7280', marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  scheduleTime: { fontSize: 20, fontWeight: '600', color: '#111827' },
  noSchedule: { fontSize: 15, color: '#9ca3af' },
  clockButton: {
    borderRadius: 16, paddingVertical: 28, alignItems: 'center', marginVertical: 16,
  },
  clockInButton: { backgroundColor: '#2563eb' },
  clockOutButton: { backgroundColor: '#059669' },
  clockButtonDisabled: { backgroundColor: '#9ca3af' },
  clockButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  clockSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  payrollCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  payrollLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  payrollAmount: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
});

const noStoreStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  inputRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { marginTop: 10, fontSize: 13, color: '#ef4444', textAlign: 'center' },
});
