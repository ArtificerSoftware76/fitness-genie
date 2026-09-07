import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useFitness } from '@/context/FitnessContext';
import { Card, LoadingState, PageHeader, PrimaryButton, Screen, TextButton } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';
import { DatabaseKind, exportDatabase, importDatabase } from '@/services/databaseTransfer';
import { Client, Exercise } from '@/data/types';
import { fitnessGenieLogo } from '@/assets/branding';
import { AppIcon, AppIconName } from '@/components/AppIcon';

export default function SettingsScreen() {
  const colors = useColors();
  const { clients, exercises, pdfLogoUri, setPdfLogoUri, replaceClients, importExercises, hydrated } = useFitness();
  const [busy, setBusy] = useState<DatabaseKind | null>(null);

  if (!hydrated) return <LoadingState />;

  const recordsFor = (kind: DatabaseKind) => kind === 'clients' ? clients : exercises;
  const titleFor = (kind: DatabaseKind) => kind === 'clients' ? 'Client database' : 'Exercise database';
  const iconFor = (kind: DatabaseKind): AppIconName => kind === 'clients' ? 'users' : 'activity';

  const handleExport = async (kind: DatabaseKind) => {
    try {
      setBusy(kind);
      await exportDatabase(kind, recordsFor(kind));
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'The database could not be exported.');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (kind: DatabaseKind) => {
    try {
      setBusy(kind);
      const imported = await importDatabase(kind);
      if (!imported) return;
      const count = imported.length;
      Alert.alert(
        `Replace ${kind} database?`,
        `This will replace the current ${recordsFor(kind).length} records with ${count} imported records.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              if (kind === 'clients') replaceClients(imported as Client[]);
              else importExercises(imported as Exercise[]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'The database file could not be read.');
    } finally {
      setBusy(null);
    }
  };

  const choosePdfLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 1], quality: 0.9 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let logoUri = asset.uri;
        if (Platform.OS !== 'web') {
          const extension = asset.fileName?.split('.').pop()?.toLowerCase() || asset.mimeType?.split('/').pop() || 'png';
          const source = new File(asset.uri);
          const destination = new File(Paths.document, `fitness-genie-pdf-logo.${extension}`);
          if (destination.exists) destination.delete();
          source.copy(destination);
          logoUri = destination.uri;
        }
        setPdfLogoUri(logoUri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    } catch (error) {
      Alert.alert('Logo could not be saved', error instanceof Error ? error.message : 'Please choose another image.');
    }
  };

  return <Screen>
    <PageHeader eyebrow="CONTROL" title="Settings" subtitle="Move your Fitness Genie databases between devices or keep a backup in your files." />
    <View style={styles.logoSection}>
      <View style={styles.cardHeader}>
        <View style={[styles.databaseIcon, { backgroundColor: colors.secondary }]}><AppIcon name="image" size={20} color={colors.secondaryForeground} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>PDF logo</Text><Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>Add your logo to the top of every workout PDF.</Text></View>
      </View>
      <Image source={pdfLogoUri ? { uri: pdfLogoUri } : fitnessGenieLogo} style={styles.logoPreview} resizeMode="contain" />
      <View style={styles.actions}>
        <View style={styles.actionSlot}><PrimaryButton label={pdfLogoUri ? 'Change logo' : 'Choose logo'} icon="upload" onPress={choosePdfLogo} secondary /></View>
        {pdfLogoUri ? <View style={styles.actionSlot}><TextButton label="Use default logo" icon="rotate-ccw" onPress={() => setPdfLogoUri('')} /></View> : null}
      </View>
    </View>
    <DatabaseCard kind="clients" count={clients.length} title={titleFor('clients')} icon={iconFor('clients')} busy={busy === 'clients'} onExport={handleExport} onImport={handleImport} />
    <DatabaseCard kind="exercises" count={exercises.length} title={titleFor('exercises')} icon={iconFor('exercises')} busy={busy === 'exercises'} onExport={handleExport} onImport={handleImport} />
    <Text style={[styles.note, { color: colors.mutedForeground }]}>Workouts are kept on this device and are not included in either database export.</Text>
  </Screen>;
}

function DatabaseCard({ kind, count, title, icon, busy, onExport, onImport }: { kind: DatabaseKind; count: number; title: string; icon: AppIconName; busy: boolean; onExport: (kind: DatabaseKind) => void; onImport: (kind: DatabaseKind) => void }) {
  const colors = useColors();
  return <Card>
    <View style={styles.cardHeader}>
      <View style={[styles.databaseIcon, { backgroundColor: colors.secondary }]}><AppIcon name={icon} size={20} color={colors.secondaryForeground} /></View>
      <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{count} {kind === 'clients' ? 'saved relationships' : 'available movements'}</Text></View>
    </View>
    <View style={styles.actions}>
      <View style={styles.actionSlot}><PrimaryButton label="Export" icon="share-2" onPress={() => onExport(kind)} disabled={busy} secondary /></View>
      <View style={styles.actionSlot}><PrimaryButton label="Import" icon="download" onPress={() => onImport(kind)} disabled={busy} /></View>
    </View>
  </Card>;
}

const styles = StyleSheet.create({
  logoSection: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  databaseIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  actionSlot: { flex: 1 },
  logoPreview: { width: '100%', height: 190 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 10 },
});