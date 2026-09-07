import React, { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFitness } from '@/context/FitnessContext';
import { Client } from '@/data/types';
import { Card, Chip, EmptyState, Field, IconButton, PageHeader, PageSearch, PrimaryButton, Screen, TextButton } from '@/components/Primitives';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';
import { getClientAvatarUri, openClientPhotoSettings, selectClientPhoto } from '@/services/clientPhotos';

const empty = { name: '', email: '', phone: '', notes: '', photoUri: '', active: true };

export default function ClientsScreen() {
  const colors = useColors();
  const { clients, addClient, updateClient, deleteClient } = useFitness();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const filteredClients = useMemo(() => clients.filter((client) => `${client.name} ${client.email} ${client.phone}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);

  const open = (client?: Client) => {
    setEditing(client ?? null);
    setForm(client ? { name: client.name, email: client.email, phone: client.phone, notes: client.notes, photoUri: client.photoUri, active: client.active } : empty);
    setVisible(true);
  };
  const choosePhoto = async () => {
    try {
      const selection = await selectClientPhoto(ImagePicker);
      if (selection.status === 'denied') {
        Alert.alert('Photo access needed', 'Allow Fitness Genie to access photos so you can add a client picture.');
      } else if (selection.status === 'settings-required') {
        Alert.alert(
          'Photo access needed',
          'Photo access is turned off. Allow Fitness Genie to access photos in your device settings.',
          Platform.OS === 'web'
            ? undefined
            : [
                { text: 'Not now', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    void openPhotoSettings();
                  },
                },
              ],
        );
      } else if (selection.status === 'selected') {
        setForm((current) => ({ ...current, photoUri: selection.uri }));
      }
    } catch (error) {
      Alert.alert('Photo could not be selected', error instanceof Error ? error.message : 'Please choose another image.');
    }
  };
  const openPhotoSettings = async () => {
    const result = await openClientPhotoSettings(Platform.OS, () => Linking.openSettings());
    if (result === 'failed') {
      Alert.alert('Settings could not be opened', 'Open your device settings and allow Fitness Genie to access photos.');
    }
  };
  const save = () => {
    if (!form.name.trim()) return Alert.alert('Client name required', 'Add a name before saving.');
    if (editing) updateClient(editing.id, form); else addClient(form);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setVisible(false);
  };

  return <Screen>
    <PageHeader eyebrow="People" title="Clients" subtitle={<PageSearch value={search} onChangeText={setSearch} placeholder="Search clients, email, phone" />} action={<IconButton icon="user-plus" label="Add client" tone="primary" onPress={() => open()} />} />
     {clients.length === 0 ? <Card><EmptyState icon="users" title="Add your first client" body="Contact details stay on this device and make sharing a workout fast." action={<PrimaryButton label="Add client" icon="plus" onPress={() => open()} />} /></Card> : filteredClients.length === 0 ? <Card><EmptyState icon="search" title="No clients found" body="Try a different name, email, or phone number." /></Card> : filteredClients.map((client) => <Pressable key={client.id} onPress={() => open(client)}><Card><View style={styles.clientRow}><View style={[styles.avatar, { backgroundColor: colors.secondary }]}>{getClientAvatarUri(client) ? <Image source={{ uri: getClientAvatarUri(client) }} style={styles.avatarImage} contentFit="cover" /> : <Text style={[styles.initials, { color: colors.secondaryForeground }]}>{client.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Text>}</View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.foreground }]}>{client.name}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{client.email || client.phone || 'Contact details not added'}</Text></View><Chip label={client.active ? 'Active' : 'Paused'} active={client.active} /></View></Card></Pressable>)}
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modal} bottomOffset={64} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}><IconButton icon="x" label="Close client form" onPress={() => setVisible(false)} /><Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? 'Edit client' : 'New client'}</Text><IconButton icon="check" label="Save client" tone="primary" onPress={save} /></View>
         <Pressable accessibilityRole="button" accessibilityLabel={form.photoUri ? 'Change client photo' : 'Add client photo'} onPress={() => { void choosePhoto(); }} style={[styles.photoPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.photoPreview, { backgroundColor: colors.secondary }]}>{getClientAvatarUri(form) ? <Image source={{ uri: getClientAvatarUri(form) }} style={styles.photoImage} contentFit="cover" /> : <AppIcon name="image" size={25} color={colors.secondaryForeground} />}</View>
           <View style={styles.photoCopy}><Text style={[styles.name, { color: colors.foreground }]}>{form.photoUri ? 'Change client photo' : 'Add client photo'}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{form.photoUri ? 'Choose a different picture' : 'Use a picture instead of initials'}</Text></View>
           <AppIcon name={form.photoUri ? 'refresh-cw' : 'plus'} size={19} color={colors.primary} />
         </Pressable>
        <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Client name" />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder="name@example.com" keyboardType="email-address" />
        <Field label="Phone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} placeholder="Mobile number" keyboardType="phone-pad" />
        <Field label="Coach notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Goals, preferences, important context" multiline />
         <Pressable style={styles.activeRow} onPress={() => setForm({ ...form, active: !form.active })}><View><Text style={[styles.name, { color: colors.foreground }]}>Active client</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>Include in workout creation</Text></View><AppIcon name={form.active ? 'check-circle' : 'circle'} size={24} color={form.active ? colors.primary : colors.mutedForeground} /></Pressable>
         {editing ? <TextButton label="Delete client" icon="trash-2" onPress={() => Alert.alert('Delete client?', 'Their existing workouts will remain available.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteClient(editing.id); setVisible(false); } }])} /> : null}
      </KeyboardAwareScrollViewCompat>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 13, marginTop: 4 },
  modal: { padding: 20, gap: 17, minHeight: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 21, fontWeight: '700' },
  photoPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 17 },
  photoPreview: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoCopy: { flex: 1, minWidth: 0 },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
});