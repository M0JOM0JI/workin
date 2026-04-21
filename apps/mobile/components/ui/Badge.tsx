import { View, Text, StyleSheet } from 'react-native';

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

const variantStyle: Record<Variant, { bg: string; text: string; dot: string }> = {
  green:  { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  yellow: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  red:    { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  blue:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  gray:   { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
};

interface BadgeProps {
  variant?: Variant;
  dot?: boolean;
  children: string;
}

export function Badge({ variant = 'gray', dot, children }: BadgeProps) {
  const s = variantStyle[variant];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: s.dot }]} />}
      <Text style={[styles.text, { color: s.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});
