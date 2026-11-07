import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { HomeHeader } from '@/components/home/HomeHeader';
import { ACTIVITY_TAG, MemoryPhoto } from '@/components/memories/MemoryPhoto';
import { currentUserId } from '@/lib/auth';
import { colors, fonts } from '@/constants/theme';
import { usePets } from '@/hooks/usePets';
import { initial } from '@/lib/format';
import { buildRecapDraft, saveRecap, type RecapDraft } from '@/lib/memoriesData';
import { selectedPetStore } from '@/lib/store';
import type { Pet } from '@/types/firestore';

export default function RecapScreen() {
  const { pets, pet } = usePets();
  const petId = pet?.petId;

  const [draft, setDraft] = useState<RecapDraft | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  // Fresh draft whenever the pet changes. Nothing is saved until Save.
  useEffect(() => {
    if (!pet) return;
    (async () => {
      const d = await buildRecapDraft(pet.petId);
      setDraft(d);
      setTitle(`This month with ${pet.name}`);
      setCaption(d.memories.find((m) => m.description)?.description ?? '');
      setError(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  /** Render the story card to an image file, or null where capture isn't supported. */
  const renderCard = async (): Promise<string | null> => {
    try {
      return await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
    } catch {
      return null;
    }
  };

  const save = async () => {
    if (!pet || !draft || busy) return;
    setBusy('save');
    setError(null);
    try {
      await saveRecap({
        petId: pet.petId,
        createdBy: currentUserId(),
        title: title.trim(),
        caption: caption.trim(),
        draft,
        localImageUri: await renderCard(),
      });
      setSavedFor(pet.petId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy('share');
    setError(null);
    try {
      const uri = await renderCard();
      if (!uri || !(await Sharing.isAvailableAsync())) {
        setError("Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } finally {
      setBusy(null);
    }
  };

  const saved = savedFor === petId;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeHeader
        pet={pet}
        pets={pets}
        onSelectPet={(id) => selectedPetStore.set(id)}
        eyebrow="Memory Recap"
        compact
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {pet && draft && (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
              <StoryCard
                pet={pet}
                draft={draft}
                title={title}
                caption={caption}
                onTitleChange={setTitle}
                onCaptionChange={setCaption}
              />
            </View>

            <Text style={styles.note}>
              Story preview · tap the title or caption to edit before saving
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            {saved && <Text style={styles.success}>Saved to {pet.name}&apos;s recaps.</Text>}

            <View style={styles.actions}>
              <Pressable
                style={[styles.action, styles.primary, (saved || !!busy) && styles.disabled]}
                onPress={save}
                disabled={saved || !!busy}
                accessibilityRole="button"
              >
                <Ionicons
                  name={saved ? 'checkmark' : 'download-outline'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.actionText, styles.primaryText]}>
                  {busy === 'save' ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.action, !!busy && styles.disabled]}
                onPress={share}
                disabled={!!busy}
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
                <Text style={styles.actionText}>Share</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() => setPreviewOpen(true)}
                accessibilityRole="button"
              >
                <Ionicons name="grid-outline" size={20} color={colors.text} />
                <Text style={styles.actionText}>Preview</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {pet && draft && (
        <Modal
          visible={previewOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewOpen(false)}
        >
          <View style={styles.previewBackdrop}>
            <Pressable
              style={styles.previewClose}
              onPress={() => setPreviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <StoryCard pet={pet} draft={draft} title={title} caption={caption} />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

type StoryCardProps = {
  pet: Pet;
  draft: RecapDraft;
  title: string;
  caption: string;
  /** Omit to show read-only text. */
  onTitleChange?: (t: string) => void;
  onCaptionChange?: (t: string) => void;
};

function StoryCard({ pet, draft, title, caption, onTitleChange, onCaptionChange }: StoryCardProps) {
  const { memories, people } = draft;
  const [hero, ...rest] = memories;
  const small = rest.slice(0, 2);
  const secondLine = memories.find((m) => m.description && m.description !== caption)?.description;
  const walks = memories.filter((m) => m.activityType === 'Walk').length;
  const month = draft.start
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const stats = [
    `${people.length} family member${people.length === 1 ? '' : 's'}`,
    `${walks} walk${walks === 1 ? '' : 's'}`,
    `${memories.length} moment${memories.length === 1 ? '' : 's'}`,
  ].join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.segments}>
        <View style={[styles.segment, styles.segmentActive]} />
        <View style={styles.segment} />
        <View style={styles.segment} />
      </View>
      <Text style={styles.month}>{month}</Text>
      {onTitleChange ? (
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          style={styles.title}
          accessibilityLabel="Recap title"
        />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      <Text style={styles.sub}>{memories.length} memories · made by the whole family</Text>

      {hero && (
        <MemoryPhoto
          memory={hero}
          style={styles.hero}
          tag={ACTIVITY_TAG[hero.activityType] ?? hero.activityType}
        />
      )}
      {small.length > 0 && (
        <View style={styles.smallRow}>
          {small.map((m) => (
            <MemoryPhoto
              key={m.memoryId}
              memory={m}
              style={styles.small}
              tag={ACTIVITY_TAG[m.activityType] ?? m.activityType}
            />
          ))}
        </View>
      )}

      {onCaptionChange ? (
        <TextInput
          value={caption}
          onChangeText={onCaptionChange}
          placeholder={`Add a caption about ${pet.name}`}
          placeholderTextColor={colors.textMuted}
          style={styles.caption}
          multiline
          accessibilityLabel="Recap caption"
        />
      ) : (
        !!caption && <Text style={styles.caption}>“{caption}”</Text>
      )}
      {secondLine && <Text style={styles.secondLine}>“{secondLine}”</Text>}

      <View style={styles.people}>
        {people.map((u, i) => (
          <View key={u.userId} style={[styles.person, i > 0 && styles.personOverlap]}>
            <Text style={styles.personText}>{initial(u.name)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.stats}>{stats}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 14, paddingBottom: 40 },
  cardWrap: { backgroundColor: colors.background },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  segments: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', marginBottom: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track },
  segmentActive: { backgroundColor: colors.primary },
  month: { fontSize: 12, fontFamily: fonts.heading, color: colors.textMuted, letterSpacing: 1 },
  title: {
    fontSize: 26,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: 'center',
    padding: 0,
    alignSelf: 'stretch',
  },
  sub: { fontSize: 13, color: colors.textMuted },
  hero: { alignSelf: 'stretch', height: 170, marginTop: 4 },
  smallRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  small: { flex: 1, height: 110 },
  caption: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: 'center',
    alignSelf: 'stretch',
    padding: 0,
    marginTop: 4,
  },
  secondLine: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  people: { flexDirection: 'row', marginTop: 6 },
  person: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personOverlap: { marginLeft: -8 },
  personText: { fontSize: 13, fontFamily: fonts.heading, color: colors.text },
  stats: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  note: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  error: { fontSize: 14, color: colors.openText, textAlign: 'center' },
  success: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.doneText,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontSize: 15, fontFamily: fonts.subheading, color: colors.text },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryText: { color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,16,14,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  previewClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
