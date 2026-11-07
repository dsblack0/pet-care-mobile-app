// The pet details form shared by Add a Pet and onboarding.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/form/DateField';
import { fieldStyles } from '@/components/form/fieldStyles';
import { SelectField } from '@/components/form/SelectField';
import { SectionHeader } from '@/components/log/SectionHeader';
import { colors, fonts } from '@/constants/theme';
import type { NewPetInput } from '@/lib/petData';

type Props = {
  submitLabel: string;
  submitIcon?: ComponentProps<typeof Ionicons>['name'];
  footerHint?: string;
  /** Throw to show the error under the form. */
  onSubmit: (input: NewPetInput) => Promise<void>;
};

const SPECIES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'] as const;
const SEXES = ['Male', 'Female'] as const;

/** Whole years between a birthday and today. */
function yearsSince(date: Date): number {
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) years -= 1;
  return Math.max(0, years);
}

/** YYYY-MM-DD in local time. */
function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function PetForm({ submitLabel, submitIcon, footerHint, onSubmit }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<(typeof SPECIES)[number] | null>(null);
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [sex, setSex] = useState<(typeof SEXES)[number] | null>(null);
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickBirthday = (date: Date) => {
    setBirthday(date);
    if (!age) setAge(String(yearsSince(date)));
  };

  const submit = async () => {
    if (saving) return;
    const missing = [
      !name.trim() && 'pet name',
      !species && 'species',
      !age && 'approximate age',
      !sex && 'sex',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please add the ${missing.join(', ')}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        species: species!,
        gender: sex!,
        age: Number(age),
        breed: breed.trim() || null,
        birthday: birthday ? toDateString(birthday) : null,
        weight: weight ? Number(weight) : null,
        localPhotoUri: photoUri,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, styles.photoCard]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Ionicons name="image-outline" size={30} color={colors.textMuted} />
            <Text style={styles.photoEmptyText}>Pet photo</Text>
          </View>
        )}
        <Pressable style={styles.photoButton} onPress={pickPhoto} accessibilityRole="button">
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.photoButtonText}>{photoUri ? 'Change photo' : 'Add photo'}</Text>
        </Pressable>
        <Text style={styles.hint}>Optional — you can add or change this later</Text>
      </View>

      <View>
        <SectionHeader title="Pet details" />
        <View style={[styles.card, styles.form]}>
          <View>
            <Text style={fieldStyles.label}>Pet name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter pet's name"
              placeholderTextColor={colors.textMuted}
              style={[fieldStyles.box, fieldStyles.inputText]}
            />
          </View>

          <View>
            <Text style={fieldStyles.label}>Species *</Text>
            <SelectField
              label="Species *"
              placeholder="Select species"
              value={species}
              options={SPECIES}
              onChange={setSpecies}
            />
          </View>

          <View>
            <Text style={fieldStyles.label}>Breed</Text>
            <TextInput
              value={breed}
              onChangeText={setBreed}
              placeholder="Enter breed (optional)"
              placeholderTextColor={colors.textMuted}
              style={[fieldStyles.box, fieldStyles.inputText]}
            />
          </View>

          <View>
            <Text style={fieldStyles.label}>Approximate age *</Text>
            <View style={fieldStyles.box}>
              <TextInput
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                placeholder="Enter age"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                style={fieldStyles.text}
              />
              <Text style={styles.unit}>years</Text>
            </View>
          </View>

          <View>
            <Text style={fieldStyles.label}>Birthday</Text>
            <DateField
              label="Birthday"
              value={birthday}
              onChange={pickBirthday}
              maximumDate={new Date()}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={fieldStyles.label}>Sex *</Text>
              <SelectField
                label="Sex *"
                placeholder="Select"
                value={sex}
                options={SEXES}
                onChange={setSex}
              />
            </View>
            <View style={styles.flex}>
              <Text style={fieldStyles.label}>Weight</Text>
              <View style={fieldStyles.box}>
                <TextInput
                  value={weight}
                  onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  style={fieldStyles.text}
                />
                <Text style={styles.unit}>lb</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={submit}
          disabled={saving}
          accessibilityRole="button"
        >
          {submitIcon && <Ionicons name={submitIcon} size={22} color="#FFFFFF" />}
          <Text style={styles.buttonText}>{saving ? 'Saving…' : submitLabel}</Text>
        </Pressable>
        {footerHint && <Text style={styles.hint}>{footerHint}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  flex: { flex: 1, minWidth: 0 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  photoCard: { alignItems: 'center', gap: 12 },
  photo: { width: 110, height: 110, borderRadius: 24 },
  photoEmpty: {
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmptyText: { fontSize: 12, color: colors.textMuted },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
  },
  photoButtonText: { fontSize: 15, fontFamily: fonts.heading, color: '#FFFFFF' },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  unit: { fontSize: 14, color: colors.textMuted },
  footer: { gap: 10 },
  error: { fontSize: 14, color: colors.openText, textAlign: 'center' },
  button: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: '#FFFFFF' },
});
