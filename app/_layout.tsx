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
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CompletionUndoProvider } from '../src/components/CompletionUndoProvider';
import { DuelyDialogProvider } from '../src/components/DuelyDialog';
import { LaunchScreen } from '../src/components/LaunchScreen';
import { initialRouteAction } from '../src/domain/initialRoute';
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
  const pendingInitialRoute = useRef<'onboarding' | 'tabs' | null>(null);
  const nativeSplashHidden = useRef(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    null,
  );
  const [initialRouteReady, setInitialRouteReady] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const appReady = (fontsLoaded || !!fontError) && onboardingCompleted !== null;

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
    if (!appReady || initialRouteReady) return;
    const action = initialRouteAction(!!onboardingCompleted, segments[0]);

    if (action === 'onboarding') {
      if (pendingInitialRoute.current !== 'onboarding') {
        pendingInitialRoute.current = 'onboarding';
        router.replace('/onboarding');
      }
      return;
    }

    if (action === 'tabs') {
      if (pendingInitialRoute.current !== 'tabs') {
        pendingInitialRoute.current = 'tabs';
        router.replace('/(tabs)');
      }
      return;
    }

    pendingInitialRoute.current = null;
    setInitialRouteReady(true);
  }, [
    appReady,
    initialRouteReady,
    onboardingCompleted,
    router,
    segments,
  ]);

  const finishLaunch = useCallback(() => setLaunchComplete(true), []);
  const revealLaunchScreen = useCallback(() => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {appReady && (
        <DuelyDialogProvider>
          <AuthStoreProvider>
            <AiPrivacyStoreProvider>
              <TaskStoreProvider>
                <CloudBackupStoreProvider>
                  <CompletionUndoProvider>
                    <ReminderStoreProvider>
                      <NotificationStoreProvider>
                        <Stack
                          initialRouteName={
                            onboardingCompleted ? '(tabs)' : 'onboarding'
                          }
                          screenOptions={{
                            contentStyle: { backgroundColor: colors.background },
                            headerStyle: { backgroundColor: colors.background },
                            headerShadowVisible: false,
                            headerTintColor: colors.text,
                            headerTitleStyle: {
                              fontFamily: typography.heading,
                            },
                          }}
                        >
                          <Stack.Screen
                            name="onboarding"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="sign-in"
                            options={{
                              gestureEnabled: false,
                              headerShown: false,
                            }}
                          />
                          <Stack.Screen
                            name="legal/terms"
                            options={{ title: 'Beta Terms' }}
                          />
                          <Stack.Screen
                            name="legal/privacy"
                            options={{ title: 'Beta Privacy Notice' }}
                          />
                          <Stack.Screen
                            name="(tabs)"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="auth/callback"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="task/new"
                            options={{
                              presentation: 'modal',
                              title: 'Add task',
                            }}
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
        </DuelyDialogProvider>
      )}
      {!launchComplete && (
        <LaunchScreen
          onFinished={finishLaunch}
          onReadyToDisplay={revealLaunchScreen}
          ready={appReady && initialRouteReady}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
