import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { PetFace } from "@/components/pet/PetFace";
import { colors, fonts } from "@/constants/theme";
import { rememberInvitation } from "@/lib/pendingInvite";

/** Fallback when a custom-scheme link was shared before the app was installed. */
export default function InviteCodeScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const scrollY = useSharedValue(0);
  const atBottom = useSharedValue(0);

  const changeCode = (text: string) => {
    setCode(text);
    setError("");
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) changeCode(text.trim());
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/welcome");
  };

  const submit = async () => {
    const token = code.trim();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) {
      setError(
        "That code doesn’t look complete. Copy the whole code from the invite message.",
      );
      return;
    }
    await rememberInvitation(token);
    router.replace({
      pathname: "/invite/[invitationId]",
      params: { invitationId: token },
    });
  };

  const empty = !code.trim();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.back}
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} accessibilityRole="header">
          Enter invite code
        </Text>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.art}
            accessible
            accessibilityLabel="A phone receiving a family invite"
          >
            <View style={styles.phone}>
              <View style={styles.notch} />
              <View style={styles.bubble}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.bubbleDot} />
                ))}
              </View>
            </View>
            <View style={styles.inviteCard}>
              <PetFace
                species="Dog"
                mood="happy"
                size={30}
                scrollY={scrollY}
                atBottom={atBottom}
                tappable={false}
              />
              <View style={styles.cardLines}>
                <View style={[styles.cardLine, styles.cardLineLong]} />
                <View style={[styles.cardLine, styles.cardLineShort]} />
              </View>
            </View>
            <View style={styles.plus}>
              <Ionicons name="add" size={20} color={colors.text} />
            </View>
          </View>

          <Text style={styles.title}>Join your family’s pet</Text>
          <Text style={styles.subtitle}>
            Got an invite from your family? Paste the code here. Then sign in
            with the email address the invite was sent to.
          </Text>

          <View style={styles.form}>
            <View style={[styles.line, !!error && styles.lineError]}>
              <View style={styles.pasteSpacer} />
              <TextInput
                value={code}
                onChangeText={changeCode}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Paste invite code"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Invite code"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                style={styles.input}
              />
              <Pressable
                style={styles.paste}
                onPress={() => void paste()}
                accessibilityRole="button"
                accessibilityLabel="Paste invite code"
              >
                <Ionicons
                  name="clipboard-outline"
                  size={22}
                  color={colors.primary}
                />
              </Pressable>
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, empty && styles.buttonDisabled]}
              onPress={() => void submit()}
              disabled={empty}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Join</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerMuted}>Don’t have a code?</Text>
          <Text style={styles.footerStrong}>
            Ask your pet’s owner to invite you from the Family tab.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    minHeight: 48,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  art: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  phone: {
    width: 66,
    height: 124,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 8,
  },
  notch: {
    position: "absolute",
    top: 6,
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  bubble: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    marginRight: -40,
  },
  bubbleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  inviteCard: {
    position: "absolute",
    left: -6,
    top: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 98,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  cardLines: { flex: 1, gap: 6 },
  cardLine: { height: 6, borderRadius: 3 },
  cardLineLong: { backgroundColor: colors.surface },
  cardLineShort: { width: "65%", backgroundColor: "#C9C2F6" },
  plus: {
    position: "absolute",
    right: 22,
    top: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.text,
    backgroundColor: colors.butter,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  form: { width: "100%", alignItems: "center", gap: 10, marginTop: 36 },
  line: {
    width: "100%",
    maxWidth: 300,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  lineError: { borderBottomColor: colors.openText },
  pasteSpacer: { width: 44 },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 20,
    fontFamily: fonts.subheading,
    color: colors.text,
  },
  paste: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.openText,
    textAlign: "center",
  },
  button: {
    marginTop: 14,
    height: 48,
    paddingHorizontal: 36,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 17, fontFamily: fonts.heading, color: "#FFFFFF" },
  footer: { alignItems: "center", gap: 4, paddingHorizontal: 24, paddingBottom: 12 },
  footerMuted: { fontSize: 15, color: colors.textMuted },
  footerStrong: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.primary,
    textAlign: "center",
  },
});
