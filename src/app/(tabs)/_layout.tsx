import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs, router, usePathname } from "expo-router";

import { useEffect, useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";
import { sessionStore } from "@/lib/auth";
import { pendingInvitation } from "@/lib/pendingInvite";
import { recordVisitedPage } from "@/lib/navigationHistory";

type IconName = ComponentProps<typeof Ionicons>["name"];

// Filled when selected, outlined otherwise.
function TabIcon({
  focused,
  filled,
  outline,
}: {
  focused: boolean;
  filled: IconName;
  outline: IconName;
}) {
  return (
    <Ionicons
      name={focused ? filled : outline}
      size={24}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

function tabIcon(filled: IconName, outline: IconName) {
  return function Icon({ focused }: { focused: boolean }) {
    return <TabIcon focused={focused} filled={filled} outline={outline} />;
  };
}

function OnboardingRedirect() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void pendingInvitation().then((value) => {
      if (!cancelled) setToken(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (token === undefined) return null;
  if (token)
    return (
      <Redirect
        href={{
          pathname: "/invite/[invitationId]",
          params: { invitationId: token },
        }}
      />
    );
  return <Redirect href="/start" />;
}

export default function TabLayout() {
  const session = sessionStore.useValue();
  const pathname = usePathname();
  useEffect(() => {
    if (session === "ready") recordVisitedPage(pathname);
  }, [pathname, session]);
  if (session === "loading") return null;
  if (session === "onboarding") return <OnboardingRedirect />;
  if (session !== "ready") return <Redirect href="/welcome" />;

  // A tab press must target its overview route, not the last active nested
  // screen (Rewards, Help, Profile, Memory Details, etc.). Using one explicit
  // route replacement for all three tabs avoids competing navigation actions.
  const overviewTabListeners = (overview: "/(tabs)/challenges" | "/(tabs)/memories" | "/(tabs)/family") => ({
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      router.replace(overview);
    },
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="challenges"
        listeners={() => overviewTabListeners("/(tabs)/challenges")}
        options={{
          title: "Challenges",
          popToTopOnBlur: true,
          tabBarIcon: tabIcon("flag", "flag-outline"),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: () => (
            <View style={styles.logButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        listeners={() => overviewTabListeners("/(tabs)/memories")}
        options={{
          title: "Memories",
          popToTopOnBlur: true,
          tabBarIcon: tabIcon("images", "images-outline"),
        }}
      />
      <Tabs.Screen
        name="family"
        listeners={() => overviewTabListeners("/(tabs)/family")}
        options={{
          title: "Family",
          popToTopOnBlur: true,
          tabBarIcon: tabIcon("people", "people-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
