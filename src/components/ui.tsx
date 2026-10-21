import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, font, radius, spacing } from '../theme/colors';
import { yen } from '../lib/format';

export function Card({ children, style, tint }: { children: ReactNode; style?: ViewStyle; tint?: string }) {
  return <View style={[styles.card, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** 価格を大きく表示する。最安値ならミント、高ければピーチのバッジを付ける */
export function PriceTag({ price, min, size = 'lg' }: { price: number | null; min?: number | null; size?: 'lg' | 'md' }) {
  const isCheapest = price != null && min != null && price <= min;
  const diff = price != null && min != null ? price - min : 0;
  return (
    <View style={styles.priceRow}>
      <Text style={[font.price, size === 'md' && { fontSize: 20 }]}>{yen(price)}</Text>
      {isCheapest ? (
        <Badge color={colors.cheap} icon="trophy">最安</Badge>
      ) : diff > 0 ? (
        <Badge color={colors.expensive} icon="arrow-up">{`+${yen(diff)}`}</Badge>
      ) : null}
    </View>
  );
}

export function Badge({ children, color, icon }: { children: ReactNode; color: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {icon ? <Ionicons name={icon} size={12} color={colors.ink} /> : null}
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function StoreDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function ProductImage({ uri, size = 56 }: { uri: string | null; size?: number }) {
  if (!uri) {
    return (
      <View style={[styles.imageFallback, { width: size, height: size }]}>
        <Ionicons name="basket-outline" size={size * 0.5} color={colors.inkSoft} />
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="contain" />;
}

export function Button({
  title,
  onPress,
  icon,
  color = colors.primary,
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.ink} /> : null}
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={font.caption}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkSoft} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Empty({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.primary} />
      <Text style={[font.body, { textAlign: 'center', color: colors.inkSoft }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...font.title, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
  imageFallback: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
});
