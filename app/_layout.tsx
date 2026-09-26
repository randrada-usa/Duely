import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

import { CompletionUndoProvider } from '../src/components/CompletionUndoProvider';
import { loadOnboardingCompleted } from '../src/services/onboardingStorage';
import { AiPrivacyStoreProvider } from '../src/store/AiPrivacyStore';
import { AuthStoreProvider } from '../src/store/AuthStore';
import { CloudBackupStoreProvider } from '../src/store/CloudBackupStore';
import { NotificationStoreProvider } from '../src/store/NotificationStore';
import { ReminderStoreProvider } from '../src/store/ReminderStore';
import { TaskStoreProvider } from '../src/store/TaskStore';
import { colors, typography } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const handledInitialRoute = useRef(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null,
  );
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    let active = true;
    void loadOnboardingCompleted().then(
      (completed) => {
        if (active) setOnboardingCompleted(completed);
      },
      () => {
        if (active) setOnboardingCompleted(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && onboardingCompleted !== null) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, onboardingCompleted]);

  useEffect(() => {
    if (
      handledInitialRoute.current ||
      onboardingCompleted === null ||
      (!fontsLoaded && !fontError)
    ) {
      return;
    }

    handledInitialRoute.current = true;
    const isOnboarding = segments[0] === 'onboarding';

    if (!onboardingCompleted && !isOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingCompleted && isOnboarding) {
      router.replace('/(tabs)');
    }
  }, [fontError, fontsLoaded, onboardingCompleted, router, segments]);

  if ((!fontsLoaded && !fontError) || onboardingCompleted === null) return null;

  return (
    <AuthStoreProvider>
      <AiPrivacyStoreProvider>
        <TaskStoreProvider>
          <CloudBackupStoreProvider>
            <CompletionUndoProvider>
              <ReminderStoreProvider>
                <NotificationStoreProvider>
                  <StatusBar style="dark" />
                  <Stack
                  initialRouteName={onboardingCompleted ? '(tabs)' : 'onboarding'}
                  screenOptions={{
                    contentStyle: { backgroundColor: colors.background },
                    headerStyle: { backgroundColor: colors.background },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontFamily: typography.heading },
                  }}
                >
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="auth/callback"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="task/new"
                    options={{ title: 'Add task', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="task/[id]"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="ocr-evaluation"
                    options={{ title: 'OCR evaluation' }}
                  />
                  </Stack>
                </NotificationStoreProvider>
              </ReminderStoreProvider>
            </CompletionUndoProvider>
          </CloudBackupStoreProvider>
        </TaskStoreProvider>
      </AiPrivacyStoreProvider>
    </AuthStoreProvider>
  );
}
