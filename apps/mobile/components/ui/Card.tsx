import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '@/lib/theme';

interface CardProps extends ViewProps {
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ style, padding = 'md', children, ...props }: CardProps) {
  const paddingMap = { sm: 12, md: 16, lg: 20 };
  return (
    <View
      style={[styles.card, { padding: paddingMap[padding] }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
});
