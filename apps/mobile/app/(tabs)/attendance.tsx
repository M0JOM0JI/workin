import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card, Badge } from '@/components/ui';
import { colors, fontSize, spacing } from '@/lib/theme';
import { formatMinutes } from '@workin/utils';

export default function AttendanceScreen() {
  const [yearMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { data } = useQuery({
    queryKey: ['my-attendance', yearMonth],
    queryFn: () => api.get(`/me/attendance?yearMonth=${yearMonth}`).then((r) => r.data),
  });

  const records = data ?? [];
  const totalMinutes = records.reduce((acc: number, r: any) => {
    if (!r.clockOut) return acc;
    return acc + Math.floor((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 60000);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>출근 기록</Text>
        <Text style={styles.month}>{yearMonth.replace('-', '년 ')}월</Text>
      </View>

      {/* 월간 요약 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{records.length}일</Text>
          <Text style={styles.summaryLabel}>출근 횟수</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatMinutes(totalMinutes)}</Text>
          <Text style={styles.summaryLabel}>총 근무시간</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {records.length === 0 ? (
          <Text style={styles.empty}>출근 기록이 없습니다.</Text>
        ) : (
          records.map((r: any) => {
            const duration = r.clockOut
              ? Math.floor((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 60000)
              : null;
            return (
              <Card key={r.id} padding="md" style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>
                    {format(new Date(r.clockIn), 'MM.dd (EEE)', { locale: undefined })}
                  </Text>
                  <Badge variant={r.clockOut ? 'gray' : 'green'} dot>
                    {r.clockOut ? '퇴근' : '근무 중'}
                  </Badge>
                </View>
                <View style={styles.recordTimes}>
                  <Text style={styles.timeText}>
                    출근 {format(new Date(r.clockIn), 'HH:mm')}
                  </Text>
                  {r.clockOut && (
                    <Text style={styles.timeText}>
                      퇴근 {format(new Date(r.clockOut), 'HH:mm')}
                    </Text>
                  )}
                  {duration && (
                    <Text style={styles.durationText}>{formatMinutes(duration)}</Text>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary },
  month: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  summaryRow: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: 14, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.primary },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  divider: { width: 1, backgroundColor: colors.border },
  scroll: { padding: spacing.xl, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  recordCard: {},
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recordDate: { fontSize: fontSize.base, fontWeight: '600', color: colors.textPrimary },
  recordTimes: { flexDirection: 'row', gap: spacing.lg },
  timeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  durationText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginLeft: 'auto' },
});
