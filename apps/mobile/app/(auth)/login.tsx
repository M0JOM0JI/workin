import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginScreen() {
  const { setAuth, setCurrentStoreId } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      // 1. 로그인 → accessToken + user
      const { data } = await api.post('/auth/login', { email, password });
      await setAuth(data.user, data.accessToken);

      // 2. 소속 매장 첫 번째를 currentStoreId로 설정
      const { data: stores } = await api.get('/stores');
      if (stores.length > 0) {
        await setCurrentStoreId(stores[0].store.id);
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('로그인 실패', err.response?.data?.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Workin</Text>
      <Text style={styles.subtitle}>알바 관리 서비스</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '로그인 중...' : '로그인'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 24 },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#2563eb' },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 40 },
  form: { width: '100%', gap: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', color: '#2563eb', marginTop: 8 },
});
