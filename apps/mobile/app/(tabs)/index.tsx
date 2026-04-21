import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatKRW } from '@workin/utils';

export default function HomeScreen() {
  const qc = useQueryClient();
  const { user, currentStoreId } = useAuthStore();
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
            {format(new Date(todaySchedule.startAt), 'HH:mm')} ~{' '}
            {format(new Date(todaySchedule.endAt), 'HH:mm')}
          </Text>
        ) : (
          <Text style={styles.noSchedule}>오늘 스케줄이 없습니다</Text>
        )}
      </View>

      {/* 출퇴근 버튼 */}
      {!currentStoreId ? (
        <View style={[styles.clockButton, styles.clockButtonDisabled]}>
          <Text style={styles.clockButtonText}>소속 매장 없음</Text>
        </View>
      ) : loadingAtt ? (
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
              출근 {format(new Date(myAttendance.clockIn), 'HH:mm')}
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
