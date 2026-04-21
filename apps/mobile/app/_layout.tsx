import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoaded, loadFromStorage } = useAuthStore();

  // 앱 시작 시 SecureStore에서 토큰 로드
  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      // 인증 없음 → 로그인으로
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      // 이미 로그인 → 홈으로
      router.replace('/(tabs)');
    }
  }, [user, isLoaded, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
