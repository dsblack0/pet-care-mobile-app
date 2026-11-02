import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="challenges"
        options={{ title: 'Challenges', tabBarIcon: tabIcon('flag', 'flag-outline') }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: () => (
            <View style={styles.logButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{ title: 'Memories', tabBarIcon: tabIcon('images', 'images-outline') }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: 'Family', tabBarIcon: tabIcon('people', 'people-outline') }}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
