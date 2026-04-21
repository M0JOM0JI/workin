import { View, Text, Image, StyleSheet } from 'react-native';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];

const sizeMap = { sm: 28, md: 36, lg: 44, xl: 64 };

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const dim = sizeMap[size];
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <View style={[styles.container, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color }]}>
      {src
        ? <Image source={{ uri: src }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
        : <Text style={[styles.text, { fontSize: dim * 0.38 }]}>{name.slice(0, 1)}</Text>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { color: '#fff', fontWeight: 'bold' },
});
