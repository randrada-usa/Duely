import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, minimumTouchTarget, typography } from '../../src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  scan: { active: 'camera', inactive: 'camera-outline' },
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
        height: 74,
        paddingBottom: 7,
        paddingTop: 7,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        elevation: 14,
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
            size={route.name === 'scan' ? 25 : size}
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
    width: 54,
    height: 54,
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.background,
    borderRadius: 27,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.primary,
    elevation: 8,
  },
  tabLabel: { fontFamily: typography.bodySemibold, fontSize: 11 },
});
