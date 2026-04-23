import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { api } from '@/lib/api';
import { Card } from '@/components/ui';
import { colors, fontSize, spacing } from '@/lib/theme';
import { formatKRW, formatMinutes } from '@workin/utils';

export default function PayrollScreen() {
  const [month, setMonth] = useState(new Date());
  const yearMonth = format(month, 'yyyy-MM');

  const { data } = useQuery({
    queryKey: ['my-payroll', yearMonth],
    queryFn: () => api.get(`/me/payroll?yearMonth=${yearMonth}`).then((r) => r.data),
  });

  const records: any[] = data ?? [];
  const totalNet = records.reduce((acc, r) => acc + (r.netPay ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>급여 확인</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonth((m) => subMonths(m, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.month}>{format(month, 'yyyy년 MM월')}</Text>
          <TouchableOpacity onPress={() => setMonth((m) => addMonths(m, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 총 예상 수령액 */}
      <Card style={styles.totalCard} padding="lg">
        <Text style={styles.totalLabel}>이번달 예상 수령액</Text>
        <Text style={styles.totalAmount}>{formatKRW(totalNet)}</Text>
        <Text style={styles.totalNote}>* 최종 확정 전 변동 가능합니다</Text>
      </Card>

      <ScrollView contentContainerStyle={styles.scroll}>
        {records.map((r, i) => (
          <Card key={i} padding="md">
            <Text style={styles.storeName}>{r.store?.name ?? '매장'}</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>근무시간</Text>
              <Text style={styles.rowValue}>{formatMinutes(r.totalMinutes)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>기본급</Text>
              <Text style={styles.rowValue}>{formatKRW(r.basePay)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>3.3% 공제</Text>
              <Text style={[styles.rowValue, { color: colors.danger }]}>
                -{formatKRW(r.deduction)}
              </Text>
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalRowLabel}>실수령액</Text>
              <Text style={styles.totalRowValue}>{formatKRW(r.netPay)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  month: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, minWidth: 90, textAlign: 'center' },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  totalCard: { margin: spacing.xl, marginBottom: 0 },
  totalLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  totalAmount: { fontSize: fontSize.xxxl, fontWeight: 'bold', color: colors.primary },
  totalNote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  scroll: { padding: spacing.xl, gap: spacing.sm },
  storeName: { fontSize: fontSize.base, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  rowValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm },
  totalRowLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.textPrimary },
  totalRowValue: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.primary },
});
