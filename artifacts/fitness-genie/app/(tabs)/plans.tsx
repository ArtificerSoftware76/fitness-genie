import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFitness, makeWorkoutItem } from '@/context/FitnessContext';
import { WorkoutItem, workoutTypes } from '@/data/types';
import { Card, Chip, EmptyState, Field, IconButton, PageHeader, PageSearch, PrimaryButton, Screen, TextButton } from '@/components/Primitives';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { emailWorkoutPdf, shareWorkoutPdf } from '@/services/sharing';
import { getVideoThumbnailUri, getVideoUri, playVideo } from '@/services/drive';
import { AppIcon } from '@/components/AppIcon';

function getExerciseMediaUri(exercise: { photoUri: string; videoThumbnailUri?: string; videoFileId: string }): string | undefined {
  return getVideoThumbnailUri(exercise.videoFileId, exercise.videoThumbnailUri) || exercise.photoUri || undefined;
}

export default function PlansScreen() {
  const colors = useColors();
  const { clients, exercises, workouts, pdfLogoUri, addWorkout, deleteWorkout, markWorkoutSent } = useFitness();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [workoutSearch, setWorkoutSearch] = useState('');

  const searchResults = useMemo(() => exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.trim().toLowerCase())), [exercises, query]);
  const availableSearchResults = useMemo(() => searchResults.filter((exercise) => !items.some((item) => item.exerciseId === exercise.id)), [searchResults, items]);
  const filteredWorkouts = useMemo(() => workouts.filter((workout) => {
    const client = clients.find((entry) => entry.id === workout.clientId);
    return `${workout.title} ${workout.description} ${client?.name ?? ''}`.toLowerCase().includes(workoutSearch.toLowerCase());
  }), [workouts, clients, workoutSearch]);
  const reset = () => { setTitle(''); setClientId(clients.find((client) => client.active)?.id ?? ''); setDescription(''); setItems([]); setQuery(''); };
  const open = () => { reset(); setVisible(true); };
  const toggleExercise = (exerciseId: string) => setItems((current) => current.some((item) => item.exerciseId === exerciseId) ? current.filter((item) => item.exerciseId !== exerciseId) : [...current, makeWorkoutItem(exerciseId)]);
  const patchItem = (id: string, updates: Partial<WorkoutItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  const save = () => {
    if (!clientId) return Alert.alert('Choose a client', 'Add or select the person this workout is for.');
    if (!title.trim()) return Alert.alert('Name the workout');
    if (!items.length) return Alert.alert('Add at least one exercise');
    addWorkout({ title: title.trim(), clientId, description: description.trim(), date: new Date().toLocaleDateString(), items });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setVisible(false);
  };
  const share = async (workoutId: string, channel: 'email' | 'share') => {
    const workout = workouts.find((entry) => entry.id === workoutId);
    const client = clients.find((entry) => entry.id === workout?.clientId);
    if (!workout || !client) return;
    try {
      setSharing(workoutId);
      const result = channel === 'email'
        ? await emailWorkoutPdf(workout, client, exercises, pdfLogoUri)
        : await shareWorkoutPdf(workout, client, exercises, pdfLogoUri);
      if (result === 'unavailable') {
        Alert.alert(
          'No PDF destination available',
          'This device cannot email or share PDFs. Try again on a device with email or sharing enabled.',
        );
        return;
      }
      markWorkoutSent(workoutId);
    } catch (error) { Alert.alert('Could not share PDF', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSharing(null); }
  };
  const openVideo = async (videoUri: string) => {
    try {
      await playVideo(videoUri);
    } catch {
      Alert.alert('Could not play video', 'The saved Google Drive video could not be opened.');
    }
  };

  return <Screen>
    <PageHeader eyebrow="Programs" title="Workouts" subtitle={<PageSearch value={workoutSearch} onChangeText={setWorkoutSearch} placeholder="Search workouts or clients" />} action={<IconButton icon="plus" label="Create workout" tone="primary" onPress={open} />} />
    {!clients.length ? <Card><EmptyState icon="user-plus" title="Add a client first" body="Every workout is personalized and addressed to a client." /></Card> : null}
    {clients.length > 0 && workouts.length === 0 ? <Card><EmptyState icon="clipboard" title="Build your first workout" body="Search the exercise library, tune the prescription, then share the finished PDF." action={<PrimaryButton label="Create workout" icon="plus" onPress={open} />} /></Card> : workouts.length > 0 && filteredWorkouts.length === 0 ? <Card><EmptyState icon="search" title="No workouts found" body="Try a different workout title or client name." /></Card> : filteredWorkouts.map((workout) => {
      const client = clients.find((entry) => entry.id === workout.clientId);
      return <Card key={workout.id} accent={workout.sentAt ? colors.primary : colors.secondaryForeground}>
        <View style={styles.planHead}><View style={{ flex: 1 }}><Text style={[styles.planTitle, { color: colors.foreground }]}>{workout.title}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{client?.name ?? 'Unknown client'} · {workout.items.length} exercises · {workout.date}</Text></View>{workout.sentAt ? <Chip label="Sent" active /> : <Chip label="Draft" />}</View>
        {workout.description ? <Text style={[styles.description, { color: colors.mutedForeground }]}>{workout.description}</Text> : null}
        <View style={styles.actionRow}><PrimaryButton label={sharing === workout.id ? 'Preparing…' : 'Email PDF'} icon="mail" onPress={() => share(workout.id, 'email')} disabled={sharing === workout.id} /><PrimaryButton label="Text / Share" icon="share-2" onPress={() => share(workout.id, 'share')} secondary disabled={sharing === workout.id} /></View>
        <TextButton label="Delete workout" icon="trash-2" onPress={() => Alert.alert('Delete workout?', workout.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(workout.id) }])} />
      </Card>;
    })}
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modal} bottomOffset={80} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}><IconButton icon="x" label="Close workout builder" onPress={() => setVisible(false)} /><Text style={[styles.modalTitle, { color: colors.foreground }]}>New workout</Text><IconButton icon="check" label="Save workout" tone="primary" onPress={save} /></View>
         <Field label="Workout title" value={title} onChangeText={setTitle} placeholder="Name this workout" />
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CLIENT</Text>
        <View style={styles.wrap}>{clients.filter((client) => client.active).map((client) => <Chip key={client.id} label={client.name} active={clientId === client.id} onPress={() => setClientId(client.id)} />)}</View>
        <Field label="Overview for client" value={description} onChangeText={setDescription} placeholder="Focus, pacing, warm-up notes" multiline />
         <View style={styles.exerciseHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercises</Text><Chip label={`${items.length} selected`} active={items.length > 0} /></View>
         <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}><AppIcon name="search" size={17} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder={`Search ${exercises.length} exercises`} placeholderTextColor={colors.mutedForeground} style={{ flex: 1, color: colors.foreground }} /></View>
        {items.map((item, index) => {
          const exercise = exercises.find((entry) => entry.id === item.exerciseId);
          if (!exercise) return null;
           const videoUri = getVideoUri(exercise.videoFileId, exercise.videoUri);
            return <Card key={item.id}><View style={styles.itemHead}><View style={[styles.order, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>{index + 1}</Text></View>{getExerciseMediaUri(exercise) ? <View style={styles.selectedThumbWrap}><Image source={{ uri: getExerciseMediaUri(exercise) }} style={styles.selectedThumb} contentFit="cover" cachePolicy="memory-disk" />{videoUri ? <Pressable accessibilityRole="button" accessibilityLabel={`Play ${exercise.name} video`} testID={`Play ${exercise.name} video in selected workout`} onPress={() => { void openVideo(videoUri); }} style={[styles.pickerPlayBadge, { backgroundColor: colors.primary }]}><AppIcon name="play" size={9} color={colors.primaryForeground} /></Pressable> : null}</View> : null}<Text style={[styles.itemName, { color: colors.foreground }]}>{exercise.name}</Text><IconButton icon="x" label={`Remove ${exercise.name}`} onPress={() => toggleExercise(item.exerciseId)} /></View><View style={styles.grid}><MiniField label="SETS" value={item.sets} onChange={(sets) => patchItem(item.id, { sets })} colors={colors} /><MiniField label="REPETITIONS" value={item.reps} onChange={(reps) => patchItem(item.id, { reps })} colors={colors} /><MiniField label="RESISTANCE" value={item.resistance} onChange={(resistance) => patchItem(item.id, { resistance })} colors={colors} /><MiniField label="DURATION" value={item.duration} onChange={(duration) => patchItem(item.id, { duration })} colors={colors} /><MiniField label="REST" value={item.rest} onChange={(rest) => patchItem(item.id, { rest })} colors={colors} /></View><View style={styles.typeSection}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TYPE</Text><View style={styles.typeRow}>{workoutTypes.map((type) => <Pressable key={type} accessibilityRole="button" accessibilityLabel={`${type} type`} testID={`${type} type`} onPress={() => patchItem(item.id, { type })} style={[styles.typeButton, { borderColor: item.type === type ? colors.primary : colors.border, backgroundColor: item.type === type ? colors.primary : colors.card }]}><Text style={[styles.typeButtonText, { color: item.type === type ? colors.primaryForeground : colors.mutedForeground }]}>{type}</Text></Pressable>)}</View></View><Field label="Client-specific notes" value={item.notes} onChangeText={(notes) => patchItem(item.id, { notes })} placeholder="Optional" /></Card>;
        })}
         {availableSearchResults.map((exercise) => { const mediaUri = getExerciseMediaUri(exercise); const videoUri = getVideoUri(exercise.videoFileId, exercise.videoUri); return <Pressable key={exercise.id} onPress={() => toggleExercise(exercise.id)} style={[styles.result, { borderColor: colors.border }]}>{mediaUri ? <Image source={{ uri: mediaUri }} style={styles.resultThumb} contentFit="cover" cachePolicy="memory-disk" /> : <View style={[styles.resultThumb, { backgroundColor: colors.muted }]}><AppIcon name="image" size={16} color={colors.mutedForeground} /></View>}{videoUri ? <Pressable accessibilityRole="button" accessibilityLabel={`Play ${exercise.name} video`} testID={`Play ${exercise.name} video in workout picker`} onPress={(event) => { event.stopPropagation(); void openVideo(videoUri); }} style={[styles.pickerPlayBadge, { backgroundColor: colors.primary }]}><AppIcon name="play" size={9} color={colors.primaryForeground} /></Pressable> : null}<Text style={[styles.resultName, { color: colors.foreground }]}>{exercise.name}</Text><AppIcon name="plus-circle" size={20} color={colors.mutedForeground} /></Pressable>; })}
        <PrimaryButton label="Save workout" icon="check" onPress={save} />
      </KeyboardAwareScrollViewCompat>
    </Modal>
  </Screen>;
}

function MiniField({ label, value, onChange, colors }: { label: string; value: string; onChange: (value: string) => void; colors: ReturnType<typeof useColors> }) {
  return <View style={{ width: '48%', gap: 5 }}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={onChange} style={[styles.miniInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} /></View>;
}

const styles = StyleSheet.create({
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planTitle: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 5 },
  description: { fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 9 },
  modal: { padding: 20, gap: 16, minHeight: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  search: { minHeight: 46, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  result: { borderBottomWidth: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultThumb: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pickerPlayBadge: { position: 'absolute', right: -3, bottom: -3, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultName: { flex: 1, fontSize: 14, fontWeight: '600' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  order: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selectedThumbWrap: { width: 38, height: 38, position: 'relative' },
  selectedThumb: { width: 38, height: 38, borderRadius: 11 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  typeSection: { gap: 7 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeButton: { width: '23.5%', minHeight: 34, borderWidth: 1, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  typeButtonText: { fontSize: 10, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  miniInput: { borderWidth: 1, borderRadius: 11, minHeight: 42, paddingHorizontal: 10, fontSize: 13 },
});