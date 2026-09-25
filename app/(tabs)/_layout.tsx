import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, minimumTouchTarget, typography } from '../../src/theme/tokens';
import { bottomTabBarStyle } from '../../src/theme/navigation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  scan: { active: 'camera', inactive: 'camera-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
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
      tabBarStyle: bottomTabBarStyle(insets.bottom),
      tabBarItemStyle: { minHeight: minimumTouchTarget },
      tabBarIcon: ({ color, focused, size }) => {
        const icon = icons[route.name] ?? icons.index;
        return (
          <View style={route.name === 'scan' ? styles.scanIcon : [styles.iconPill, focused && styles.activeIconPill]}>
            <Ionicons
              accessibilityElementsHidden
              allowFontScaling={false}
              color={route.name === 'scan' ? colors.surface : color}
              name={focused ? icon.active : icon.inactive}
              size={route.name === 'scan' ? 25 : size}
            />
          </View>
        );
      },
    })}>
      <Tabs.Screen
        name="index"
        options={{ tabBarAccessibilityLabel: 'Home tab', title: 'Home' }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ tabBarAccessibilityLabel: 'Tasks tab', title: 'Tasks' }}
      />
      <Tabs.Screen
        name="scan"
        options={{ tabBarAccessibilityLabel: 'Scan tab', title: 'Scan' }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ tabBarAccessibilityLabel: 'Calendar tab', title: 'Calendar' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarAccessibilityLabel: 'Profile tab', title: 'Profile' }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null, title: 'Notifications' }}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    elevation: 8,
  },
  iconPill: { width: 48, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activeIconPill: { backgroundColor: colors.primarySoft },
  tabLabel: { fontFamily: typography.bodySemibold, fontSize: 11, marginTop: 4 },
});
