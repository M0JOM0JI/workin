import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: '홈' }} />
      <Tabs.Screen name="schedule"   options={{ title: '스케줄' }} />
      <Tabs.Screen name="attendance" options={{ title: '출근기록' }} />
      <Tabs.Screen name="payroll"    options={{ title: '급여' }} />
      <Tabs.Screen name="profile"    options={{ title: '프로필' }} />
    </Tabs>
  );
}
