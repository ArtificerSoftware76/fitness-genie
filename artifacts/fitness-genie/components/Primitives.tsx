import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { fitnessGenieSearchImage } from '@/assets/branding';
import { AppIcon, AppIconName } from '@/components/AppIcon';

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: any }) {
  const colors = useColors();
  const { useSafeAreaInsets } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
  const insets = useSafeAreaInsets();
  const contentStyle = [styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + (require('react-native').Platform.OS === 'web' ? 67 : 12), paddingBottom: insets.bottom + (require('react-native').Platform.OS === 'web' ? 34 : 16) }, style];
  const Container = scroll ? require('react-native').ScrollView : View;
  return <Container contentContainerStyle={scroll ? contentStyle : undefined} style={scroll ? { backgroundColor: colors.background } : contentStyle} showsVerticalScrollIndicator={false}>{children}</Container>;
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  const colors = useColors();
  return <View style={styles.header}>
    <View style={styles.headerTitle}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
    {action}
    {subtitle ? <View style={styles.headerSubtitle}>{typeof subtitle === 'string' ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : subtitle}</View> : null}
  </View>;
}

export function PageSearch({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const colors = useColors();
  return <View style={[styles.pageSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <AppIcon name="search" size={17} color={colors.mutedForeground} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} style={[styles.pageSearchInput, { color: colors.foreground }]} />
    <Image source={fitnessGenieSearchImage} style={styles.pageSearchLogo} contentFit="contain" />
  </View>;
}

export function IconButton({ icon, onPress, label, tone = 'default' }: { icon: AppIconName; onPress: () => void; label: string; tone?: 'default' | 'primary' | 'danger' }) {
  const colors = useColors();
  const backgroundColor = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.destructive : colors.card;
  const iconColor = tone === 'primary' || tone === 'danger' ? colors.primaryForeground : colors.foreground;
  return <Pressable accessibilityLabel={label} testID={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}><AppIcon name={icon} size={19} color={iconColor} /></Pressable>;
}

export function PrimaryButton({ label, onPress, icon, disabled = false, secondary = false }: { label: string; onPress: () => void; icon?: AppIconName; disabled?: boolean; secondary?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" testID={label} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, { backgroundColor: secondary ? colors.secondary : colors.primary, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>{icon ? <AppIcon name={icon} size={17} color={secondary ? colors.secondaryForeground : colors.primaryForeground} /> : null}<Text style={[styles.buttonText, { color: secondary ? colors.secondaryForeground : colors.primaryForeground }]}>{label}</Text></Pressable>;
}

export function TextButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: AppIconName }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.55 : 1 }]}>{icon ? <AppIcon name={icon} size={15} color={colors.primary} /> : null}<Text style={[styles.textButtonLabel, { color: colors.primary }]}>{label}</Text></Pressable>;
}

export function Card({ children, style, accent }: { children: ReactNode; style?: any; accent?: string }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null, style]}>{children}</View>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' }) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.background }, multiline ? styles.multiline : null]} /></View>;
}

export function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const colors = useColors();
  const content = <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>;
  return onPress ? <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted }]}>{content}</Pressable> : <View style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted }]}>{content}</View>;
}

export function EmptyState({ icon, title, body, action }: { icon: AppIconName; title: string; body: string; action?: ReactNode }) {
  const colors = useColors();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><AppIcon name={icon} size={25} color={colors.secondaryForeground} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>{action}</View>;
}

export function LoadingState() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.mutedForeground, marginTop: 10 }}>Preparing your studio…</Text></View>;
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 18, minHeight: '100%' },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  headerTitle: { flex: 1, minWidth: 0 },
  headerSubtitle: { width: '100%' },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700', marginBottom: 6 },
  pageTitle: { fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  pageSearch: { width: '100%', minHeight: 44, borderRadius: 15, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  pageSearchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 0 },
  pageSearchLogo: { width: 38, height: 38 },
  iconButton: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primaryButton: { minHeight: 48, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  textButtonLabel: { fontSize: 14, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  input: { borderWidth: 1, minHeight: 47, borderRadius: 13, paddingHorizontal: 13, fontSize: 15 },
  multiline: { minHeight: 88, paddingTop: 12 },
  chip: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 18, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});