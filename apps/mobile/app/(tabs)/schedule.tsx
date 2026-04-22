import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Card } from '@/components/ui';
import { colors, fontSize, spacing } from '@/lib/theme';
import { formatTime } from '@workin/utils';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function ScheduleScreen() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = format(days[0], 'yyyy-MM-dd');
  const to   = format(days[6], 'yyyy-MM-dd');

  // TODO: storeId 동적으로 가져오기
  const { data: schedules = [] } = useQuery({
    queryKey: ['my-schedules', from, to],
    queryFn: () => api.get(`/me/schedules?from=${from}&to=${to}`).then((r) => r.data),
  });

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>내 스케줄</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekStart((d) => addDays(d, -7))} style={styles.navBtn}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>
            {format(days[0], 'MM.dd')} - {format(days[6], 'MM.dd')}
          </Text>
          <TouchableOpacity onPress={() => setWeekStart((d) => addDays(d, 7))} style={styles.navBtn}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const daySchedules = schedules.filter((s: any) =>
            format(new Date(s.startAt), 'yyyy-MM-dd') === dayStr,
          );
          const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');

          return (
            <View key={dayStr} style={styles.dayRow}>
              <View style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                  {DAYS[day.getDay()]}
                </Text>
                <Text style={[styles.dateText, isToday && styles.dateTextToday]}>
                  {format(day, 'd')}
                </Text>
              </View>

              <View style={styles.dayContent}>
                {daySchedules.length === 0 ? (
                  <Text style={styles.emptyDay}>-</Text>
                ) : (
                  daySchedules.map((s: any) => (
                    <Card key={s.id} padding="sm" style={styles.scheduleCard}>
                      <Text style={styles.scheduleTime}>
                        {formatTime(s.startAt)} ~ {formatTime(s.endAt)}
                      </Text>
                    </Card>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navBtn: { padding: spacing.sm },
  navText: { fontSize: fontSize.xl, color: colors.primary },
  weekLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  scroll: { padding: spacing.xl, gap: spacing.sm },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, minHeight: 52 },
  dayLabel: { width: 40, alignItems: 'center', paddingTop: 4 },
  dayLabelToday: { backgroundColor: colors.primary, borderRadius: 10, padding: 4 },
  dayText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  dayTextToday: { color: '#fff' },
  dateText: { fontSize: fontSize.md, fontWeight: 'bold', color: colors.textPrimary },
  dateTextToday: { color: '#fff' },
  dayContent: { flex: 1, gap: 4 },
  emptyDay: { fontSize: fontSize.sm, color: colors.textMuted, paddingTop: 8 },
  scheduleCard: { backgroundColor: colors.primaryLight },
  scheduleTime: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
});
