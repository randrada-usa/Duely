import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const allowRemoval = useRef(false);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    if (!hasUnsavedChanges) allowRemoval.current = false;
  }, [hasUnsavedChanges]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!hasUnsavedChanges || allowRemoval.current) return;

        event.preventDefault();
        if (pendingNavigation.current) return;
        pendingNavigation.current = () => navigation.dispatch(event.data.action);
        setShowDiscardDialog(true);
      }),
    [hasUnsavedChanges, navigation],
  );

  const allowNavigation = useCallback(() => {
    allowRemoval.current = true;
  }, []);

  const cancelNavigation = useCallback(() => {
    pendingNavigation.current = null;
    setShowDiscardDialog(false);
  }, []);

  const discardAndNavigate = useCallback(() => {
    const continueNavigation = pendingNavigation.current;
    pendingNavigation.current = null;
    setShowDiscardDialog(false);
    allowRemoval.current = true;
    continueNavigation?.();
  }, []);

  return {
    allowNavigation,
    cancelNavigation,
    discardAndNavigate,
    showDiscardDialog,
  };
}
