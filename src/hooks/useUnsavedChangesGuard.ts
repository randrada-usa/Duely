import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const allowRemoval = useRef(false);
  const alertOpen = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) allowRemoval.current = false;
  }, [hasUnsavedChanges]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!hasUnsavedChanges || allowRemoval.current) return;

        event.preventDefault();
        if (alertOpen.current) return;
        alertOpen.current = true;

        Alert.alert(
          'Discard changes?',
          "Your changes haven't been saved.",
          [
            {
              text: 'Keep editing',
              style: 'cancel',
              onPress: () => {
                alertOpen.current = false;
              },
            },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                alertOpen.current = false;
                allowRemoval.current = true;
                navigation.dispatch(event.data.action);
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => {
              alertOpen.current = false;
            },
          },
        );
      }),
    [hasUnsavedChanges, navigation],
  );

  return useCallback(() => {
    allowRemoval.current = true;
  }, []);
}
