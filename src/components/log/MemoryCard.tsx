import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, fonts } from "@/constants/theme";

type Props = {
  petName: string;
  photoUri: string | null;
  caption: string;
  onPhotoChange: (uri: string | null) => void;
  onCaptionChange: (text: string) => void;
};

export function MemoryCard({
  petName,
  photoUri,
  caption,
  onPhotoChange,
  onCaptionChange,
}: Props) {
  const [captionHeight, setCaptionHeight] = useState(48);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) onPhotoChange(result.assets[0].uri);
  };

  return (
    <View style={styles.card}>
      {photoUri ? (
        <View>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <Pressable
            style={styles.remove}
            onPress={() => onPhotoChange(null)}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.addPhoto}
          onPress={pickPhoto}
          accessibilityRole="button"
        >
          <Ionicons name="camera" size={22} color={colors.primary} />
          <Text style={styles.addPhotoText}>Add a photo</Text>
        </Pressable>
      )}
      <View style={styles.captionField}>
        <Text style={styles.captionLabel}>Caption</Text>
        <TextInput
          value={caption}
          onChangeText={onCaptionChange}
          placeholder={`Description`}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Caption"
          multiline
          scrollEnabled={false}
          onContentSizeChange={(event) =>
            setCaptionHeight(Math.max(48, event.nativeEvent.contentSize.height))
          }
          style={[styles.caption, { height: captionHeight }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addPhoto: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.primary,
  },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 14 },
  captionField: { gap: 6 },
  captionLabel: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
  remove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
});
