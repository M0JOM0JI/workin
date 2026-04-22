import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function SignupScreen() {
  const { setAuth, setCurrentStoreId } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name     = '이름을 입력해주세요.';
    if (!form.email)              e.email    = '이메일을 입력해주세요.';
    if (form.password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다.';
    if (form.phone && !/^010-\d{4}-\d{4}$/.test(form.phone))
      e.phone = '010-0000-0000 형식으로 입력해주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.phone) payload.phone = form.phone;

      const { data } = await api.post('/auth/signup', payload);
      await setAuth(data.user, data.accessToken);

      // 신규 가입은 매장 없음 → 탭 화면으로 이동 (홈에서 안내)
      const { data: stores } = await api.get('/stores');
      if (stores.length > 0) {
        await setCurrentStoreId(stores[0].store.id);
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : (msg ?? '회원가입에 실패했습니다.');
      Alert.alert('가입 실패', text);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (key: string) => [
    styles.input,
    errors[key] ? styles.inputError : null,
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>Workin</Text>
        <Text style={styles.subtitle}>계정을 만들어 시작하세요</Text>

        <View style={styles.form}>
          {/* 이름 */}
          <View>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={inputStyle('name')}
              placeholder="홍길동"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* 이메일 */}
          <View>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="email@example.com"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* 비밀번호 */}
          <View>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={inputStyle('password')}
              placeholder="8자 이상"
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* 휴대폰 (선택) */}
          <View>
            <Text style={styles.label}>
              휴대폰 번호 <Text style={styles.optional}>(선택)</Text>
            </Text>
            <TextInput
              style={inputStyle('phone')}
              placeholder="010-0000-0000"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? '가입 중...' : '가입하기'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 24 },
  logo:     { fontSize: 36, fontWeight: 'bold', color: '#2563eb' },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 32 },
  form:     { width: '100%', gap: 14 },
  label:    { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  optional: { color: '#9ca3af', fontWeight: '400' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputError: { borderColor: '#f87171' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 3 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', color: '#2563eb', marginTop: 4 },
});
