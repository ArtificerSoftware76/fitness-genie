import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFitness } from '@/context/FitnessContext';
import { Exercise, ExerciseDraft } from '@/data/types';
import { Card, Chip, Field, IconButton, PageHeader, PageSearch, PrimaryButton, Screen, TextButton } from '@/components/Primitives';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { getVideoThumbnailUri, getVideoUri, pickAndUploadVideo, playVideo, recordAndUploadVideo } from '@/services/drive';
import { AppIcon } from '@/components/AppIcon';

const blank: ExerciseDraft = { name: '', difficultyLevel: '', jointMuscleGroup: '', intensity: '', needPurpose: '', notesCues: '', contraindications: '', modifications: '', photoUri: '', videoUri: '', videoFileId: '', videoFileName: '' };

export default function ExercisesScreen() {
  const colors = useColors();
  const { exercises, upsertExercise, deleteExercise } = useFitness();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState<ExerciseDraft>(blank);
  const [visible, setVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const filtered = useMemo(() => exercises.filter((exercise) => `${exercise.name} ${exercise.jointMuscleGroup} ${exercise.needPurpose}`.toLowerCase().includes(search.toLowerCase())), [exercises, search]);

  useEffect(() => {
    const timer = setTimeout(() => setShowInitialLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const open = (exercise?: Exercise) => { setEditing(exercise ?? null); setForm(exercise ? { ...exercise } : blank); setVisible(true); };
  const save = () => {
    if (!form.name.trim()) return Alert.alert('Exercise name required');
    upsertExercise(form, editing?.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setVisible(false);
  };
  const uploadVideo = async (record = false) => {
    if (!form.name.trim()) return Alert.alert('Name this exercise first', 'Video files use the exercise name.');
    try {
      setUploading(true);
      const uploaded = record ? await recordAndUploadVideo(form.name) : await pickAndUploadVideo(form.name);
      if (uploaded) setForm((current) => ({ ...current, videoUri: uploaded.webViewLink, videoThumbnailUri: uploaded.thumbnailLink, videoFileId: uploaded.id, videoFileName: uploaded.name }));
    } catch (error) {
      Alert.alert('Upload did not finish', error instanceof Error ? error.message : 'Please try again.');
    } finally { setUploading(false); }
  };
  const openVideo = async (videoUri: string) => {
    try {
      await playVideo(videoUri);
    } catch {
      Alert.alert('Could not play video', 'The saved Google Drive video could not be opened.');
    }
  };
  return <Screen>
    <PageHeader eyebrow="Library" title="Exercises" subtitle={<PageSearch value={search} onChangeText={setSearch} placeholder="Search exercise, muscle, purpose" />} action={<IconButton icon="plus" label="Add exercise" tone="primary" onPress={() => open()} />} />
     {filtered.map((exercise) => { const videoThumbnailUri = getVideoThumbnailUri(exercise.videoFileId, exercise.videoThumbnailUri); const mediaUri = videoThumbnailUri || exercise.photoUri; return <Pressable key={exercise.id} onPress={() => open(exercise)}><Card><View style={styles.exerciseRow}><View style={[styles.moveIcon, { backgroundColor: mediaUri ? colors.secondary : colors.muted }]}>{mediaUri ? <Image source={{ uri: mediaUri }} style={styles.thumbnail} contentFit="cover" cachePolicy="memory-disk" /> : <AppIcon name="image" size={19} color={colors.mutedForeground} />}</View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{exercise.name}</Text><Text style={[styles.difficulty, { color: colors.primary }]} numberOfLines={1}>{exercise.difficultyLevel || 'Difficulty not set'}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>{exercise.jointMuscleGroup || exercise.modifications || 'Details ready to edit'}</Text></View></View></Card></Pressable>; })}
      <Modal visible={showInitialLoading} transparent animationType="fade" onRequestClose={() => setShowInitialLoading(false)}>
        <View style={[styles.loadingBackdrop, { backgroundColor: colors.foreground + '29' }]}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.foreground }]}>Loading...</Text>
          </View>
        </View>
      </Modal>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modal} bottomOffset={70} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}><IconButton icon="x" label="Close exercise form" onPress={() => setVisible(false)} /><Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? 'Exercise details' : 'New exercise'}</Text><IconButton icon="check" label="Save exercise" tone="primary" onPress={save} /></View>
         <Pressable onPress={() => Alert.alert('Exercise video', 'Record a new demonstration or upload one from your phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Record video', onPress: () => uploadVideo(true) }, { text: 'Upload video', onPress: () => uploadVideo(false) }])} style={[styles.mediaTile, { borderColor: colors.border, backgroundColor: colors.card }]}>
             {getVideoThumbnailUri(form.videoFileId, form.videoThumbnailUri, 800) || form.photoUri ? <Image source={{ uri: getVideoThumbnailUri(form.videoFileId, form.videoThumbnailUri, 800) || form.photoUri }} style={styles.mediaImage} contentFit="cover" cachePolicy="memory-disk" /> : <View style={[styles.mediaPlaceholder, { backgroundColor: colors.muted }]}><AppIcon name="video" size={28} color={colors.mutedForeground} /><Text style={[styles.mediaPlaceholderText, { color: colors.mutedForeground }]}>Tap to record or upload</Text></View>}
           {getVideoUri(form.videoFileId, form.videoUri) ? <Pressable accessibilityRole="button" accessibilityLabel={`Play ${form.name || 'exercise'} video`} testID="Play exercise video" onPress={(event) => { event.stopPropagation(); void openVideo(getVideoUri(form.videoFileId, form.videoUri)!); }} style={[styles.detailPlayButton, { backgroundColor: colors.primary }]}><AppIcon name="play" size={23} color={colors.primaryForeground} /></Pressable> : null}
           <View style={[styles.mediaOverlay, { backgroundColor: colors.foreground + 'CC' }]}><AppIcon name={form.videoUri ? 'refresh-cw' : 'video'} size={17} color={colors.background} /><Text style={[styles.mediaOverlayText, { color: colors.background }]}>{form.videoUri ? 'Replace video' : 'Add exercise video'}</Text></View>
        </Pressable>
        <Field label="Exercise name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <View style={styles.split}><View style={{ flex: 1 }}><Field label="Difficulty Level" value={form.difficultyLevel} onChangeText={(difficultyLevel) => setForm({ ...form, difficultyLevel })} placeholder="Beginner" /></View><View style={{ flex: 1 }}><Field label="Intensity" value={form.intensity} onChangeText={(intensity) => setForm({ ...form, intensity })} placeholder="Moderate" /></View></View>
        <Field label="Joint / Muscle Group Involved" value={form.jointMuscleGroup} onChangeText={(jointMuscleGroup) => setForm({ ...form, jointMuscleGroup })} multiline />
        <Field label="Need / Purpose" value={form.needPurpose} onChangeText={(needPurpose) => setForm({ ...form, needPurpose })} multiline />
        <Field label="Notes / Cues" value={form.notesCues} onChangeText={(notesCues) => setForm({ ...form, notesCues })} multiline />
        <Field label="Contraindications" value={form.contraindications} onChangeText={(contraindications) => setForm({ ...form, contraindications })} multiline />
        <Field label="Modifications / Related Exercises" value={form.modifications} onChangeText={(modifications) => setForm({ ...form, modifications })} multiline />
        <Card><View style={styles.videoHead}><View><Text style={[styles.name, { color: colors.foreground }]}>Google Drive video</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{uploading ? 'Uploading to Fitness Genie Data…' : form.videoFileName || 'Tap the preview above to add one'}</Text></View><AppIcon name={form.videoUri ? 'check-circle' : 'cloud'} size={22} color={form.videoUri ? colors.primary : colors.mutedForeground} /></View></Card>
        {editing ? <TextButton label="Delete exercise" icon="trash-2" onPress={() => Alert.alert('Delete exercise?', editing.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteExercise(editing.id); setVisible(false); } }])} /> : null}
      </KeyboardAwareScrollViewCompat>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moveIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', borderRadius: 14 },
  name: { fontSize: 15, fontWeight: '700' },
  difficulty: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  meta: { fontSize: 12, marginTop: 4 },
  modal: { padding: 20, gap: 16, minHeight: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: 19, fontWeight: '700' },
  split: { flexDirection: 'row', gap: 10 },
  videoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaTile: { width: '90%', aspectRatio: 1.25, alignSelf: 'center', borderWidth: 1, borderRadius: 19, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  mediaPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mediaPlaceholderText: { fontSize: 13, fontWeight: '600' },
  mediaOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 48, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaOverlayText: { fontSize: 14, fontWeight: '700' },
  detailPlayButton: { position: 'absolute', top: '50%', left: '50%', width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -27 }, { translateY: -27 }] },
  loadingBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCard: { minWidth: 132, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderRadius: 16, alignItems: 'center', gap: 9 },
  loadingText: { fontSize: 13, fontWeight: '700' },
});