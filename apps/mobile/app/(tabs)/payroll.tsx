import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { api } from '@/lib/api';
import { Card } from '@/components/ui';
import { colors, fontSize, spacing, radius } from '@/lib/theme';
import { formatKRW, formatMinutes } from '@workin/utils';

interface MyPayrollRecord {
  store: { id: string; name: string };
  totalMinutes: number;
  regularMinutes: number;
  nightMinutes: number;
  overtimeMinutes: number;
  basePay: number;
  nightAllowance: number;
  overtimePay: number;
  weeklyAllowance: number;
  deduction: number;
  netPay: number;
  isConfirmed: boolean;
  confirmedAt: string | null;
}

function BreakRow({
  label, value, red, bold, indent,
}: { label: string; value: string; red?: boolean; bold?: boolean; indent?: boolean }) {
  return (
    <View style={[styles.row, indent && { paddingLeft: 12 }]}>
      <Text style={[styles.rowLabel, bold && styles.boldLabel]}>{label}</Text>
      <Text style={[styles.rowValue, red && { color: colors.danger }, bold && { color: colors.primary, fontSize: fontSize.base, fontWeight: '700' }]}>
        {value}
      </Text>
    </View>
  );
}

export default function PayrollScreen() {
  const [month, setMonth] = useState(new Date());
  const yearMonth = format(month, 'yyyy-MM');

  const { data, isLoading } = useQuery<MyPayrollRecord[]>({
    queryKey: ['my-payroll', yearMonth],
    queryFn: () => api.get(`/me/payroll?yearMonth=${yearMonth}`).then((r) => r.data),
  });

  const records = data ?? [];
  const totalNet = records.reduce((acc, r) => acc + (r.netPay ?? 0), 0);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
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

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.primary} />
      ) : records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>해당 월의 급여 데이터가 없습니다</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {records.map((r, i) => {
            const extra = r.weeklyAllowance + r.nightAllowance + r.overtimePay;
            return (
              <Card key={i} padding="md" style={styles.card}>
                {/* 매장명 + 확정 배지 */}
                <View style={styles.storeRow}>
                  <Text style={styles.storeName}>{r.store?.name ?? '매장'}</Text>
                  <View style={[styles.badge, r.isConfirmed ? styles.badgeGreen : styles.badgeYellow]}>
                    <Text style={[styles.badgeText, { color: r.isConfirmed ? '#15803d' : '#92400e' }]}>
                      {r.isConfirmed
                        ? `✓ 확정됨${r.confirmedAt ? ' · ' + format(new Date(r.confirmedAt), 'MM.dd') : ''}`
                        : '미확정'}
                    </Text>
                  </View>
                </View>

                {/* Breakdown */}
                <View style={styles.breakdown}>
                  <BreakRow label="시급" value={`${(r.basePay && r.totalMinutes) ? Math.round(r.basePay / (r.totalMinutes / 60)).toLocaleString() : 0}원`} />
                  <BreakRow label="총 근무시간" value={formatMinutes(r.totalMinutes)} />

                  <View style={styles.divider} />

                  <BreakRow label="기본급" value={formatKRW(r.basePay)} />

                  {r.weeklyAllowance > 0 && (
                    <BreakRow label="주휴수당" value={`+${formatKRW(r.weeklyAllowance)}`} indent />
                  )}
                  {r.nightAllowance > 0 && (
                    <BreakRow
                      label={`야간수당 (${formatMinutes(r.nightMinutes)})`}
                      value={`+${formatKRW(r.nightAllowance)}`}
                      indent
                    />
                  )}
                  {r.overtimePay > 0 && (
                    <BreakRow
                      label={`초과수당 (${formatMinutes(r.overtimeMinutes)})`}
                      value={`+${formatKRW(r.overtimePay)}`}
                      indent
                    />
                  )}

                  <BreakRow label="공제" value={`-${formatKRW(r.deduction)}`} red />

                  <View style={styles.divider} />
                  <BreakRow label="실수령액" value={formatKRW(r.netPay)} bold />
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:        { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  monthNav:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  month:        { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, minWidth: 90, textAlign: 'center' },
  navBtn:       { padding: 4 },
  navArrow:     { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  totalCard:    { margin: spacing.xl, marginBottom: 0 },
  totalLabel:   { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  totalAmount:  { fontSize: fontSize.xxxl, fontWeight: 'bold', color: colors.primary },
  totalNote:    { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  scroll:       { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl },
  card:         { gap: 0 },
  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { fontSize: fontSize.sm, color: colors.textMuted },

  storeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  storeName:    { fontSize: fontSize.base, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  badge:        { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen:   { backgroundColor: '#dcfce7' },
  badgeYellow:  { backgroundColor: '#fef9c3' },
  badgeText:    { fontSize: fontSize.xs, fontWeight: '600' },

  breakdown:    { gap: 2 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel:     { fontSize: fontSize.sm, color: colors.textSecondary },
  rowValue:     { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  boldLabel:    { fontSize: fontSize.base, fontWeight: '700', color: colors.textPrimary },
  divider:      { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
