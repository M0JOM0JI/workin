import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Card, Badge } from '@/components/ui';
import { colors, fontSize, spacing } from '@/lib/theme';
import { formatMinutes, formatTime } from '@workin/utils';

// ── 유틸 ──────────────────────────────────────────────────────────────────────

/** "HH:MM" + 기준 날짜(UTC ISO) → UTC ISO string */
function kstTimeToUtc(baseUtcIso: string, kstHHMM: string): string {
  const base = new Date(baseUtcIso);
  const kstDate = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  const y = kstDate.getUTCFullYear();
  const mo = kstDate.getUTCMonth();
  const d = kstDate.getUTCDate();
  const [h, m] = kstHHMM.split(':').map(Number);
  return new Date(Date.UTC(y, mo, d, h - 9, m)).toISOString();
}

/** HH:MM 형식 검증 */
function isValidTime(t: string) {
  return /^\d{2}:\d{2}$/.test(t);
}

// ── 수정 요청 상태 ────────────────────────────────────────────────────────────

const reqStatusMap = {
  PENDING:  { label: '검토 중', variant: 'yellow' as const },
  APPROVED: { label: '승인됨',  variant: 'green'  as const },
  REJECTED: { label: '거절됨',  variant: 'red'    as const },
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const yearMonth = format(month, 'yyyy-MM');

  // 출퇴근 기록
  const { data } = useQuery({
    queryKey: ['my-attendance', yearMonth],
    queryFn: () => api.get(`/me/attendance?yearMonth=${yearMonth}`).then((r) => r.data),
  });
  const records: any[] = data ?? [];

  // 내 수정 요청 목록
  const { data: myRequests } = useQuery({
    queryKey: ['my-attendance-requests'],
    queryFn: () => api.get('/me/attendance-requests').then((r) => r.data),
  });
  const requestList: any[] = myRequests ?? [];

  const totalMinutes = records.reduce((acc: number, r: any) => {
    if (!r.clockOut) return acc;
    return acc + Math.floor((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 60000);
  }, 0);

  // ── 수정 요청 모달 ──────────────────────────────────
  const [requestModal, setRequestModal] = useState<{ record: any | null; isNew: boolean }>({ record: null, isNew: false });
  const [reqClockIn,  setReqClockIn]  = useState('');
  const [reqClockOut, setReqClockOut] = useState('');
  const [reqReason,   setReqReason]   = useState('');

  function openRequestModal(record: any | null, isNew = false) {
    setRequestModal({ record, isNew });
    setReqClockIn(record ? formatTime(record.clockIn) : '');
    setReqClockOut(record?.clockOut ? formatTime(record.clockOut) : '');
    setReqReason('');
  }

  const submitRequest = useMutation({
    mutationFn: (body: object) =>
      api.post(`/stores/${requestModal.record?.storeId ?? ''}/attendance-requests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance-requests'] });
      qc.invalidateQueries({ queryKey: ['my-attendance', yearMonth] });
      setRequestModal({ record: null, isNew: false });
    },
    onError: (e: any) => {
      Alert.alert('오류', e?.response?.data?.message ?? '요청에 실패했습니다.');
    },
  });

  function handleSubmitRequest() {
    const { record, isNew } = requestModal;
    if (!record && !isNew) return;

    if (!isValidTime(reqClockIn)) {
      Alert.alert('오류', '출근 시간을 HH:MM 형식으로 입력해주세요.');
      return;
    }
    if (reqReason.trim().length < 2) {
      Alert.alert('오류', '사유를 2자 이상 입력해주세요.');
      return;
    }

    const storeId = record?.storeId ?? records[0]?.storeId;
    if (!storeId) { Alert.alert('오류', '매장 정보를 찾을 수 없습니다.'); return; }

    const base = record?.clockIn ?? new Date().toISOString();
    const requestedClockIn = kstTimeToUtc(base, reqClockIn);
    const requestedClockOut = reqClockOut && isValidTime(reqClockOut)
      ? kstTimeToUtc(base, reqClockOut)
      : null;

    submitRequest.mutate({
      attendanceId: isNew ? null : record?.id,
      requestedClockIn,
      requestedClockOut,
      reason: reqReason.trim(),
    });
  }

  // ── 렌더 ──────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>출근 기록</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => openRequestModal(null, true)}>
            <Text style={styles.addBtnText}>+ 누락 신청</Text>
          </TouchableOpacity>
        </View>
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
        {/* 진행 중인 요청 */}
        {requestList.filter((r) => r.status === 'PENDING').length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>검토 중인 요청</Text>
            {requestList
              .filter((r) => r.status === 'PENDING')
              .map((req) => (
                <View key={req.id} style={styles.pendingCard}>
                  <View style={styles.pendingRow}>
                    <Text style={styles.pendingTime}>
                      {formatTime(req.requestedClockIn)}
                      {req.requestedClockOut ? ` ~ ${formatTime(req.requestedClockOut)}` : ''}
                    </Text>
                    <Badge variant="yellow">검토 중</Badge>
                  </View>
                  <Text style={styles.pendingReason} numberOfLines={1}>사유: {req.reason}</Text>
                </View>
              ))}
          </View>
        )}

        {/* 출퇴근 기록 */}
        {records.length === 0 ? (
          <Text style={styles.empty}>출근 기록이 없습니다.</Text>
        ) : (
          records.map((r: any) => {
            const duration = r.clockOut
              ? Math.floor((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 60000)
              : null;

            // 이 기록에 연결된 요청 찾기
            const linkedReq = requestList.find((req) => req.attendanceId === r.id && req.status === 'PENDING');

            return (
              <Card key={r.id} padding="md" style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>
                    {format(new Date(r.clockIn), 'MM.dd (EEE)', { locale: ko })}
                  </Text>
                  <View style={styles.recordBadges}>
                    {r.isAutoClockOut && (
                      <Badge variant="gray">자동퇴근</Badge>
                    )}
                    <Badge variant={r.clockOut ? 'gray' : 'green'} dot>
                      {r.clockOut ? '퇴근' : '근무 중'}
                    </Badge>
                  </View>
                </View>

                <View style={styles.recordTimes}>
                  <Text style={styles.timeText}>출근 {formatTime(r.clockIn)}</Text>
                  {r.clockOut && <Text style={styles.timeText}>퇴근 {formatTime(r.clockOut)}</Text>}
                  {duration && <Text style={styles.durationText}>{formatMinutes(duration)}</Text>}
                </View>

                {linkedReq ? (
                  <View style={styles.reqBanner}>
                    <Text style={styles.reqBannerText}>⏳ 수정 요청 검토 중</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.requestBtn} onPress={() => openRequestModal(r)}>
                    <Text style={styles.requestBtnText}>수정 요청</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* ── 수정 요청 모달 ── */}
      <Modal
        visible={requestModal.record !== null || requestModal.isNew}
        transparent
        animationType="slide"
        onRequestClose={() => setRequestModal({ record: null, isNew: false })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {requestModal.isNew ? '누락 출퇴근 신청' : '출퇴근 수정 요청'}
            </Text>
            {requestModal.record && (
              <Text style={styles.modalSubtitle}>
                현재: {formatTime(requestModal.record.clockIn)}
                {requestModal.record.clockOut ? ` ~ ${formatTime(requestModal.record.clockOut)}` : ' (퇴근 없음)'}
              </Text>
            )}

            <Text style={styles.label}>출근 시간 (HH:MM, KST)</Text>
            <TextInput
              style={styles.input}
              value={reqClockIn}
              onChangeText={setReqClockIn}
              placeholder="예: 09:00"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>퇴근 시간 (HH:MM, KST, 선택)</Text>
            <TextInput
              style={styles.input}
              value={reqClockOut}
              onChangeText={setReqClockOut}
              placeholder="예: 18:00"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>사유 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reqReason}
              onChangeText={setReqReason}
              placeholder="퇴근 버튼을 누르지 못했습니다."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setRequestModal({ record: null, isNew: false })}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn, submitRequest.isPending && { opacity: 0.6 }]}
                onPress={handleSubmitRequest}
                disabled={submitRequest.isPending}
              >
                <Text style={styles.submitBtnText}>
                  {submitRequest.isPending ? '제출 중...' : '제출'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // 헤더
  header: { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  month: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, minWidth: 90, textAlign: 'center' },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },

  // 요약
  summaryRow: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: 14, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.primary },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  divider: { width: 1, backgroundColor: colors.border },

  // 스크롤
  scroll: { padding: spacing.xl, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },

  // 대기 요청 섹션
  pendingSection: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  pendingCard: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#fde68a' },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  pendingTime: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  pendingReason: { fontSize: fontSize.xs, color: colors.textMuted },

  // 기록 카드
  recordCard: { marginBottom: 0 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recordDate: { fontSize: fontSize.base, fontWeight: '600', color: colors.textPrimary },
  recordBadges: { flexDirection: 'row', gap: 4 },
  recordTimes: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  timeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  durationText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginLeft: 'auto' },
  requestBtn: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  requestBtnText: { fontSize: fontSize.xs, color: colors.textMuted },
  reqBanner: { backgroundColor: '#fffbeb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  reqBannerText: { fontSize: fontSize.xs, color: '#b45309' },

  // 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, gap: 4 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.md },
  label: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: fontSize.sm, color: colors.textPrimary, backgroundColor: colors.bg },
  textArea: { height: 72, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary },
  submitBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '700' },
});
