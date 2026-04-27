import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing, radius } from '@/lib/theme';

interface Me {
  id: string;
  email: string;
  name: string;
  phone: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { clearAuth } = useAuthStore();

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
    }
  }, [me]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch('/auth/me', { name: name.trim(), phone: phone.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => Alert.alert('오류', '저장에 실패했습니다.'),
  });

  function handleLogout() {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>프로필</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 이메일 (수정 불가) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>계정 정보</Text>
            <View style={styles.emailRow}>
              <Text style={styles.label}>이메일</Text>
              <Text style={styles.emailText}>{me?.email ?? '-'}</Text>
            </View>
          </View>

          {/* 이름 · 전화번호 수정 */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>내 정보 수정</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>이름</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="이름을 입력하세요"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="예: 010-1234-5678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {updateMutation.isPending ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 로그아웃 */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>계정</Text>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>

          {/* 앱 버전 */}
          <Text style={styles.version}>Workin v1.0.0</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { backgroundColor: colors.surface, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:        { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.textPrimary },
  scroll:       { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle:  { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },

  emailRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailText:    { fontSize: fontSize.sm, color: colors.textSecondary },

  fieldGroup:   { gap: spacing.xs },
  label:        { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
  },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  saveBtnText:  { color: colors.textInverse, fontSize: fontSize.base, fontWeight: '600' },
  btnDisabled:  { opacity: 0.6 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText:   { color: colors.danger, fontSize: fontSize.base, fontWeight: '600' },

  version:      { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
