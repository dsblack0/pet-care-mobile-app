import { useState } from "react";
import { router } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { colors } from "@/constants/theme";
import { rememberInvitation } from "@/lib/pendingInvite";

/** Fallback when a custom-scheme link was shared before the app was installed. */
export default function InviteCodeScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    const token = code.trim();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) {
      setError("Paste the full invitation code from the invitation message.");
      return;
    }
    await rememberInvitation(token);
    router.replace({
      pathname: "/invite/[invitationId]",
      params: { invitationId: token },
    });
  };
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.heading}>Join a pet family</Text>
      <Text>
        Paste the invitation code you received. You must sign in using the
        invited email address.
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Invitation code"
        accessibilityLabel="Invitation code"
        style={styles.input}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        onPress={() => void submit()}
        style={styles.button}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 20,
    justifyContent: "center",
  },
  heading: { fontSize: 26, fontWeight: "700", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
  },
  error: { color: "#b00020" },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
