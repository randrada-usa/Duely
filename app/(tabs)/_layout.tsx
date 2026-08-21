import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, minimumTouchTarget } from '../../src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  scan: { active: 'scan', inactive: 'scan-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabel: ({ children, color }) => (
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={[styles.tabLabel, { color }]}
        >
          {children}
        </Text>
      ),
      tabBarStyle: {
        height: 76,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
      },
      tabBarItemStyle: { minHeight: minimumTouchTarget },
      tabBarIcon: ({ color, focused, size }) => {
        const icon = icons[route.name] ?? icons.index;
        return (
          <Ionicons
            accessibilityElementsHidden
            allowFontScaling={false}
            color={route.name === 'scan' ? colors.surface : color}
            name={focused ? icon.active : icon.inactive}
            size={route.name === 'scan' ? 26 : size}
            style={
              route.name === 'scan'
                ? styles.scanIcon
                : undefined
            }
          />
        );
      },
    })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.primary,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
