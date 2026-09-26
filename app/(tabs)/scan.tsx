import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CameraView,
  type CameraCapturedPicture,
  type FlashMode,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomTabBarStyle } from '../../src/theme/navigation';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskEditorHero } from '../../src/components/TaskEditorHero';
import { TaskForm } from '../../src/components/TaskForm';
import {
  buildCombinedProvenance,
  mergeGeminiExtraction,
  type GeminiScanExtraction,
} from '../../src/domain/geminiExtraction';
import {
  buildMlKitProvenance,
  extractTaskFromOcr,
  scanReviewValues,
  type ScanExtraction,
} from '../../src/domain/scanExtraction';
import {
  pickedImageError,
  type PreparedScanImage,
  type ScanImageSource,
} from '../../src/domain/scanImage';
import { subjectNameKey } from '../../src/domain/subject';
import type { TaskDraft } from '../../src/domain/task';
import {
  OcrCancelledError,
  startOnDeviceOcr,
  type OcrRun,
} from '../../src/services/ocr';
import {
  cancelGeminiAssistance,
  createGeminiAssistRequestId,
  GeminiAssistError,
  requestGeminiAssistance,
  type AiAllowance,
} from '../../src/services/geminiAssist';
import {
  cleanupAbandonedScanImages,
  deleteTemporaryScanImage,
  prepareScanImage,
  rotateScanImage,
} from '../../src/services/scanImage';
import { useReminders } from '../../src/store/ReminderStore';
import { useAiPrivacy } from '../../src/store/AiPrivacyStore';
import { useAuth } from '../../src/store/AuthStore';
import { useTasks } from '../../src/store/TaskStore';
import { getSupabaseClient } from '../../src/services/supabaseClient';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
  typography,
} from '../../src/theme/tokens';

type IntakeSource = 'camera' | 'gallery';
type PermissionIssue = { source: IntakeSource; canAskAgain: boolean };
type ScanStage =
  | 'image'
  | 'processing'
  | 'ai-choice'
  | 'ai-processing'
  | 'review'
  | 'no-text'
  | 'multiple'
  | 'ocr-error'
  | 'saved';
type OcrProgressStep = 'reading' | 'organizing';

const pickerOptions: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  allowsMultipleSelection: false,
  base64: false,
  exif: false,
  mediaTypes: ['images'],
  quality: 1,
  selectionLimit: 1,
  shape: 'rectangle',
};

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();
  const { status: authStatus } = useAuth();
  const {
    featureEnabled: aiAssistEnabled,
    snapshot: aiPrivacy,
    isLoading: isAiPrivacyLoading,
    isSaving: isAiPrivacySaving,
    setAiProcessingDecision,
  } = useAiPrivacy();
  const { addTask, canEditTasks, subjects } = useTasks();
  const { defaultReminder } = useReminders();
  const [image, setImage] = useState<PreparedScanImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionIssue, setPermissionIssue] =
    useState<PermissionIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<ScanStage>('image');
  const [ocrProgressStep, setOcrProgressStep] =
    useState<OcrProgressStep>('reading');
  const [extraction, setExtraction] = useState<ScanExtraction | null>(null);
  const [geminiExtraction, setGeminiExtraction] =
    useState<GeminiScanExtraction | null>(null);
  const [aiAllowance, setAiAllowance] = useState<AiAllowance | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const activeImageUri = useRef<string | null>(null);
  const activeOcrRun = useRef<OcrRun | null>(null);
  const activeAiRun = useRef<{
    controller: AbortController;
    requestId: string;
  } | null>(null);
  const isMounted = useRef(true);
  const focusedScanFlow =
    isCameraActive || permissionIssue !== null || image !== null || scanStage !== 'image';

  useFocusEffect(
    useCallback(() => {
      setIsCameraActive(true);
      return () => {
        setIsCameraActive(false);
        setIsCameraReady(false);
      };
    }, []),
  );

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: focusedScanFlow ? { display: 'none' } : bottomTabBarStyle(insets.bottom),
    });
    return () => navigation.setOptions({ tabBarStyle: bottomTabBarStyle(insets.bottom) });
  }, [focusedScanFlow, insets.bottom, navigation]);

  const acceptPickerResult = useCallback(
    async (
      result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult,
      source: ScanImageSource,
    ) => {
      if ('code' in result) {
        setError('Android could not restore the image selection. Please try again.');
        return;
      }
      if (result.canceled) return;

      const validationError = pickedImageError(result.assets);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        const prepared = await prepareScanImage(result.assets[0], source);
        if (!isMounted.current) {
          deleteTemporaryScanImage(prepared.uri);
          return;
        }

        deleteTemporaryScanImage(activeImageUri.current);
        activeImageUri.current = prepared.uri;
        setImage(prepared);
        setScanStage('image');
        setExtraction(null);
        setGeminiExtraction(null);
        setAiAllowance(null);
        setSavedTaskId(null);
        setPermissionIssue(null);
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Duely could not prepare this image. Please try again.',
        );
      }
    },
    [],
  );

  const acceptCapturedPicture = useCallback(
    async (picture: CameraCapturedPicture) => {
      try {
        const prepared = await prepareScanImage(
          {
            uri: picture.uri,
            width: picture.width,
            height: picture.height,
            type: 'image',
            mimeType: `image/${picture.format}`,
          },
          'camera',
        );
        if (!isMounted.current) {
          deleteTemporaryScanImage(prepared.uri);
          return;
        }

        deleteTemporaryScanImage(activeImageUri.current);
        activeImageUri.current = prepared.uri;
        setImage(prepared);
        setScanStage('image');
        setExtraction(null);
        setGeminiExtraction(null);
        setAiAllowance(null);
        setSavedTaskId(null);
        setPermissionIssue(null);
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Duely could not prepare this photo. Please try again.',
        );
      }
    },
    [],
  );

  useEffect(() => {
    isMounted.current = true;

    async function recoverInterruptedSelection() {
      try {
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (pendingResult && isMounted.current) {
          setIsProcessing(true);
          await acceptPickerResult(pendingResult, 'recovered');
        }
      } finally {
        cleanupAbandonedScanImages(activeImageUri.current);
        if (isMounted.current) setIsProcessing(false);
      }
    }

    void recoverInterruptedSelection();
    return () => {
      isMounted.current = false;
      activeOcrRun.current?.cancel();
      const aiRun = activeAiRun.current;
      aiRun?.controller.abort();
      const supabase = getSupabaseClient();
      if (aiRun && supabase) void cancelGeminiAssistance(supabase, aiRun.requestId);
      deleteTemporaryScanImage(activeImageUri.current);
    };
  }, [acceptPickerResult]);

  async function launchGallery() {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      await acceptPickerResult(result, 'gallery');
    } catch {
      setError('Duely could not open Gallery. Try again or use the camera.');
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }

  async function requestAndLaunch(source: IntakeSource) {
    try {
      const permission =
        source === 'camera'
          ? await requestCameraPermission()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.granted) {
        setPermissionIssue(null);
        if (source === 'gallery') await launchGallery();
        return;
      }

      setPermissionIssue({ source, canAskAgain: permission.canAskAgain });
    } catch {
      setPermissionIssue(null);
      setError('Duely could not check this permission. Please try again.');
    }
  }

  async function beginSource(source: IntakeSource) {
    setError(null);

    if (source === 'gallery' && Platform.OS === 'android') {
      Alert.alert(
        'Choose one assignment image',
        'Android lets Duely read only the image you select. Duely will not browse your other photos.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Choose image',
            onPress: () => void launchGallery(),
          },
        ],
      );
      return;
    }

    try {
      const permission =
        source === 'camera'
          ? await getCameraPermission()
          : await ImagePicker.getMediaLibraryPermissionsAsync();

      if (permission.granted) {
        if (source === 'gallery') {
          await launchGallery();
        } else if (image) {
          removeImage();
        }
        return;
      }

      Alert.alert(
        source === 'camera' ? 'Camera access' : 'Photo access',
        source === 'camera'
          ? 'Duely needs camera access only while you capture one assignment image.'
          : 'Duely needs photo access so you can choose one assignment image.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => void requestAndLaunch(source),
          },
        ],
      );
    } catch {
      setError('Duely could not check this permission. Please try again.');
    }
  }

  async function checkPermissionAgain() {
    if (!permissionIssue) return;
    try {
      const permission =
        permissionIssue.source === 'camera'
          ? await getCameraPermission()
          : await ImagePicker.getMediaLibraryPermissionsAsync();

      if (permission.granted) {
        const source = permissionIssue.source;
        setPermissionIssue(null);
        if (source === 'gallery') await launchGallery();
        return;
      }

      setPermissionIssue({
        source: permissionIssue.source,
        canAskAgain: permission.canAskAgain,
      });
    } catch {
      setPermissionIssue(null);
      setError('Duely could not check this permission. Please try again.');
    }
  }

  async function captureAssignment() {
    if (!cameraRef.current || !isCameraReady || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        base64: false,
        exif: false,
        quality: 1,
      });
      await acceptCapturedPicture(picture);
    } catch {
      setError('Duely could not capture that photo. Hold steady and try again.');
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }

  async function rotateImage() {
    if (!image) return;
    setIsProcessing(true);
    setError(null);
    try {
      const rotated = await rotateScanImage(image);
      activeImageUri.current = rotated.uri;
      setImage(rotated);
      setScanStage('image');
      setExtraction(null);
      setGeminiExtraction(null);
      setAiAllowance(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Duely could not rotate this image. Try again.',
      );
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }

  function removeImage() {
    activeOcrRun.current?.cancel();
    activeOcrRun.current = null;
    deleteTemporaryScanImage(activeImageUri.current);
    activeImageUri.current = null;
    setImage(null);
    setScanStage('image');
    setExtraction(null);
    setGeminiExtraction(null);
    setAiAllowance(null);
    setSavedTaskId(null);
    setError(null);
  }

  async function startExtraction() {
    if (!image) return;
    const run = startOnDeviceOcr(image.uri);
    activeOcrRun.current?.cancel();
    activeOcrRun.current = run;
    setError(null);
    setExtraction(null);
    setGeminiExtraction(null);
    setAiAllowance(null);
    setOcrProgressStep('reading');
    setScanStage('processing');

    try {
      const recognition = await run.result;
      if (!isMounted.current || activeOcrRun.current !== run) return;

      setOcrProgressStep('organizing');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!isMounted.current || activeOcrRun.current !== run) return;

      const parsed = extractTaskFromOcr(recognition.text);
      if (parsed.rawText.length < 3) {
        setScanStage('no-text');
        return;
      }
      if (parsed.hasMultipleAssignments) {
        setScanStage('multiple');
        return;
      }

      setExtraction(parsed);
      setGeminiExtraction(null);
      setAiAllowance(null);
      setScanStage(
        aiAssistEnabled && authStatus === 'authenticated'
          ? 'ai-choice'
          : 'review',
      );
    } catch (caughtError) {
      if (caughtError instanceof OcrCancelledError) {
        if (activeOcrRun.current === run) setScanStage('image');
        return;
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Duely could not read this image. Please try again.',
      );
      setScanStage('ocr-error');
    } finally {
      if (activeOcrRun.current === run) activeOcrRun.current = null;
    }
  }

  function cancelExtraction() {
    const run = activeOcrRun.current;
    activeOcrRun.current = null;
    run?.cancel();
    setOcrProgressStep('reading');
    setScanStage('image');
  }

  async function runAiAssistance(localExtraction: ScanExtraction) {
    const supabase = getSupabaseClient();
    if (!supabase || authStatus !== 'authenticated') {
      setError('Sign in before using optional cloud AI. Your on-device result is ready.');
      setScanStage('review');
      return;
    }

    const controller = new AbortController();
    const requestId = createGeminiAssistRequestId();
    activeAiRun.current?.controller.abort();
    activeAiRun.current = { controller, requestId };
    setError(null);
    setScanStage('ai-processing');
    try {
      const result = await requestGeminiAssistance(
        supabase,
        requestId,
        localExtraction.rawText,
        controller.signal,
      );
      if (!isMounted.current || activeAiRun.current?.controller !== controller) return;
      if (result.extraction.hasMultipleAssignments) {
        setScanStage('multiple');
        return;
      }
      setGeminiExtraction(result.extraction);
      setAiAllowance(result.allowance);
      setScanStage('review');
    } catch (caughtError) {
      if (!isMounted.current || activeAiRun.current?.controller !== controller) return;
      if (!controller.signal.aborted) {
        setError(
          caughtError instanceof GeminiAssistError
            ? `${caughtError.message} Continue with the on-device result.`
            : 'AI assistance was unavailable. Continue with the on-device result.',
        );
      }
      setScanStage('review');
    } finally {
      if (activeAiRun.current?.controller === controller) activeAiRun.current = null;
    }
  }

  function chooseAiAssistance() {
    if (!extraction) return;
    if (aiPrivacy.aiProcessing === 'granted') {
      void runAiAssistance(extraction);
      return;
    }

    Alert.alert(
      'Send recognized text to cloud AI?',
      'Duely will send only the OCR text—not the assignment image—to Google Gemini. Duely does not retain the raw text, and you will review every suggested field. This is separate from model-improvement consent.',
      [
        { text: 'Keep it on-device', onPress: () => setScanStage('review') },
        {
          text: 'Allow and continue',
          onPress: () =>
            void setAiProcessingDecision('granted').then((saved) => {
              if (saved && extraction) void runAiAssistance(extraction);
            }),
        },
      ],
    );
  }

  function cancelAiAssistance() {
    const run = activeAiRun.current;
    activeAiRun.current = null;
    run?.controller.abort();
    const supabase = getSupabaseClient();
    if (run && supabase) void cancelGeminiAssistance(supabase, run.requestId);
    setError(null);
    setScanStage('review');
  }

  function retryWith(source: IntakeSource) {
    setError(null);
    setExtraction(null);
    setGeminiExtraction(null);
    setAiAllowance(null);
    setScanStage('image');
    void beginSource(source);
  }

  function confirmRescan(source: IntakeSource) {
    Alert.alert(
      'Discard this extraction review?',
      'Your edits and extracted fields have not been saved.',
      [
        { text: 'Keep reviewing', style: 'cancel' },
        {
          text: source === 'camera' ? 'Retake' : 'Choose image',
          style: 'destructive',
          onPress: () => retryWith(source),
        },
      ],
    );
  }

  function confirmReturnToImage() {
    Alert.alert(
      'Return to image review?',
      'Your extraction edits have not been saved.',
      [
        { text: 'Keep reviewing', style: 'cancel' },
        {
          text: 'Return to image',
          style: 'destructive',
          onPress: () => {
            setExtraction(null);
            setGeminiExtraction(null);
            setAiAllowance(null);
            setError(null);
            setScanStage('image');
          },
        },
      ],
    );
  }

  function saveExtractedTask(draft: TaskDraft, subjectName: string) {
    if (!extraction || !canEditTasks) {
      setError(
        'Task storage is unavailable. Keep this review open and try again after storage recovers.',
      );
      return;
    }

    const confirmedValues = {
      title: draft.title,
      subject: subjectName,
      dueAt: draft.dueAt,
      taskType: draft.taskType,
      priority: draft.priority,
      estimatedEffortMinutes: draft.estimatedEffortMinutes,
      notes: draft.notes,
    };
    const provenance = geminiExtraction
      ? buildCombinedProvenance(extraction, geminiExtraction, confirmedValues)
      : buildMlKitProvenance(extraction, confirmedValues);
    const saved = addTask({
      ...draft,
      sourceImageRef: null,
      extractionProvenance: provenance,
    });
    if (!saved) {
      setError('Duely could not save this task. Your review is still here; try again.');
      return;
    }

    deleteTemporaryScanImage(activeImageUri.current);
    activeImageUri.current = null;
    setImage(null);
    setExtraction(null);
    setGeminiExtraction(null);
    setAiAllowance(null);
    setError(null);
    setSavedTaskId(saved.id);
    setScanStage('saved');
  }

  if (scanStage === 'saved' && savedTaskId) {
    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.success}
              name="checkmark-circle"
              size={54}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Task saved
          </Text>
          <Text style={styles.successBody}>
            Duely saved the details you reviewed and cleared the temporary scan image.
          </Text>
        </View>
        <PrimaryButton
          label="Open task"
          onPress={() => router.push(`/task/${savedTaskId}`)}
        />
        <SecondaryButton
          label="Scan another assignment"
          onPress={() => {
            setSavedTaskId(null);
            setScanStage('image');
          }}
        />
        <TextButton label="Return Home" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  if (permissionIssue) {
    const sourceLabel = permissionIssue.source === 'camera' ? 'Camera' : 'Photos';
    const alternateSource =
      permissionIssue.source === 'camera' ? 'gallery' : 'camera';

    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {sourceLabel} access needed
          </Text>
          <Text style={styles.subtitle}>
            Duely cannot use {sourceLabel.toLocaleLowerCase()} until you allow access.
          </Text>
        </View>

        <View style={styles.permissionCard}>
          <Ionicons
            accessibilityElementsHidden
            color={colors.primary}
            name="lock-closed-outline"
            size={38}
          />
          <Text style={styles.cardTitle}>Your image stays under your control</Text>
          <Text style={styles.cardBody}>
            Access is used only to capture or select one assignment image. This
            preparation step does not upload it.
          </Text>
        </View>

        {permissionIssue.canAskAgain ? (
          <PrimaryButton
            label={`Try ${sourceLabel} access again`}
            onPress={() => void requestAndLaunch(permissionIssue.source)}
          />
        ) : (
          <>
            <PrimaryButton
              label="Open device settings"
              onPress={() => void Linking.openSettings()}
            />
            <SecondaryButton
              label="Check access again"
              onPress={() => void checkPermissionAgain()}
            />
          </>
        )}

        <SecondaryButton
          label={`Use ${alternateSource === 'camera' ? 'Camera' : 'Gallery'} instead`}
          onPress={() => {
            setPermissionIssue(null);
            void beginSource(alternateSource);
          }}
        />
        <TextButton label="Back to camera" onPress={() => setPermissionIssue(null)} />
      </ScreenShell>
    );
  }

  if (image && scanStage === 'processing') {
    const organizing = ocrProgressStep === 'organizing';
    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View
          accessibilityLabel="Reading assignment"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityValue={{
            text: organizing
              ? 'Organizing task details'
              : 'Detecting text in image',
          }}
          style={styles.progressState}
        >
          <View style={styles.progressRings}>
            <View style={styles.progressRingOuter} />
            <View style={styles.progressRingMiddle} />
            <View style={styles.progressRingInner} />
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="Duely mascot"
              resizeMode="contain"
              source={require('../../assets/mascot.png')}
              style={styles.progressMascot}
            />
          </View>
          <Text accessibilityRole="header" style={styles.progressTitle}>
            Duely is reading your assignment…
          </Text>
          <Text style={styles.progressBody}>
            Text recognition stays on this device. This usually finishes in a few seconds.
          </Text>
        </View>

        <View style={styles.progressSteps}>
          <ProgressStep active={!organizing} complete={organizing} label="Detecting text in image" />
          <ProgressStep active={false} complete={organizing} label="Extracting assignment details" />
          <ProgressStep active={organizing} complete={false} label="Organizing task and deadline" />
          <ProgressStep active={false} complete={false} label="Preparing workload for review" />
        </View>
        <TextButton label="Cancel scan" onPress={cancelExtraction} />
      </ScreenShell>
    );
  }

  if (image && scanStage === 'ai-processing') {
    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View
          accessibilityLabel="Improving assignment details with cloud AI"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.progressState}
        >
          <ActivityIndicator color={colors.primary} size="large" />
          <Text accessibilityRole="header" style={styles.progressTitle}>
            Checking the task details…
          </Text>
          <Text style={styles.progressBody}>
            Only the recognized OCR text is being processed. The assignment image stays on this phone.
          </Text>
        </View>
        <TextButton label="Cancel and use on-device result" onPress={cancelAiAssistance} />
      </ScreenShell>
    );
  }

  if (image && scanStage === 'ai-choice' && extraction) {
    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            On-device result ready
          </Text>
          <Text style={styles.subtitle}>
            Review it now, or explicitly send only the recognized text to cloud AI for another suggestion.
          </Text>
        </View>
        <View style={styles.previewCard}>
          <Image
            accessibilityLabel="Selected assignment image preview"
            resizeMode="contain"
            source={{ uri: image.uri }}
            style={styles.previewImage}
          />
        </View>
        <View style={styles.privacyCard}>
          <Ionicons
            accessibilityElementsHidden
            color={colors.primary}
            name="shield-checkmark-outline"
            size={26}
          />
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>You choose what leaves the phone</Text>
            <Text style={styles.cardBody}>
              The image is never uploaded. Cloud AI receives OCR text only, does not save it in Duely, and is separate from dataset contribution consent.
            </Text>
          </View>
        </View>
        <PrimaryButton
          disabled={isAiPrivacyLoading || isAiPrivacySaving}
          label={isAiPrivacySaving ? 'Saving privacy choice…' : 'Improve with optional cloud AI'}
          onPress={chooseAiAssistance}
        />
        <SecondaryButton label="Review on-device result" onPress={() => setScanStage('review')} />
      </ScreenShell>
    );
  }

  if (
    image &&
    (scanStage === 'no-text' ||
      scanStage === 'multiple' ||
      scanStage === 'ocr-error')
  ) {
    const title =
      scanStage === 'no-text'
        ? 'No text found'
        : scanStage === 'multiple'
          ? 'More than one assignment found'
          : 'Text extraction did not finish';
    const message =
      scanStage === 'no-text'
        ? 'Try a sharper, closer image with the assignment text fully visible.'
        : scanStage === 'multiple'
          ? 'Crop or choose an image containing only one assignment before continuing.'
          : error ?? 'Check the image and try again.';

    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View style={styles.recoveryState}>
          <Ionicons
            accessibilityElementsHidden
            color={colors.warning}
            name="alert-circle-outline"
            size={48}
          />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.recoveryBody}>{message}</Text>
        </View>
        {scanStage === 'ocr-error' && (
          <PrimaryButton label="Try text extraction again" onPress={() => void startExtraction()} />
        )}
        <SecondaryButton
          icon="camera-outline"
          label="Retake / crop"
          onPress={() => retryWith('camera')}
        />
        <SecondaryButton
          icon="images-outline"
          label="Choose / crop again"
          onPress={() => retryWith('gallery')}
        />
        <SecondaryButton
          label="Enter task manually"
          onPress={() => {
            removeImage();
            router.push('/task/new');
          }}
        />
        <TextButton label="Back to image review" onPress={() => setScanStage('image')} />
      </ScreenShell>
    );
  }

  if (image && scanStage === 'review' && extraction) {
    const reviewExtraction = geminiExtraction
      ? mergeGeminiExtraction(extraction, geminiExtraction)
      : extraction;
    const values = scanReviewValues(reviewExtraction);
    const matchingSubject = subjects.find(
      (subject) =>
        subjectNameKey(subject.name) === subjectNameKey(values.subject),
    );
    const initial: TaskDraft = {
      title: values.title,
      subjectId: matchingSubject?.id ?? null,
      notes: values.notes,
      dueAt: values.dueAt,
      taskType: values.taskType,
      estimatedEffortMinutes: values.estimatedEffortMinutes,
      priority: values.priority,
      reminderMinutesBefore: values.dueAt ? defaultReminder : null,
    };

    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.reviewSafeArea}>
        <TaskForm
          defaultReminder={defaultReminder}
          fieldNotices={reviewExtraction.issues}
          footer={
            <TextButton
              danger
              label="Re-scan"
              onPress={() =>
                confirmRescan(image.source === 'camera' ? 'camera' : 'gallery')
              }
            />
          }
          header={
            <View style={styles.reviewHeader}>
              <TaskEditorHero
                description="Check every detail before saving. Fields marked with a warning need your attention."
                eyebrow={geminiExtraction ? 'On-device + optional AI' : 'On-device extraction'}
                imageUri={image.uri}
                onBack={confirmReturnToImage}
                title="Review extraction"
                variant="light"
              />
              {reviewExtraction.needsAssignmentConfirmation && (
                <View accessibilityRole="alert" style={styles.warningCard}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.warning}
                    name="help-circle-outline"
                    size={24}
                  />
                  <Text style={styles.warningText}>
                    This image may be reference material instead of an assignment. Confirm the title and details before saving.
                  </Text>
                </View>
              )}
              <View style={styles.reviewPrivacyRow}>
                <Ionicons
                  accessibilityElementsHidden
                  color={colors.primary}
                  name="shield-checkmark-outline"
                  size={20}
                />
                <Text style={styles.reviewPrivacyBody}>
                  {geminiExtraction
                    ? 'Only OCR text was sent to cloud AI. The image stayed on this phone, and raw text is not retained by Duely.'
                    : 'Raw recognized text and the temporary image are cleared after you save or re-scan.'}
                </Text>
              </View>
              {aiAllowance && (
                <Text style={styles.allowanceText}>
                  AI-assisted scans this period: {aiAllowance.usedCount} of {aiAllowance.limit}
                </Text>
              )}
              {error && <ErrorMessage message={error} />}
            </View>
          }
          initial={initial}
          initialSubjectName={matchingSubject ? '' : values.subject}
          key={`${image.uri}-${extraction.rawText.length}-${geminiExtraction ? 'ai' : 'local'}`}
          onSubmit={(draft, context) =>
            saveExtractedTask(draft, context.subjectName)
          }
          submitLabel="Confirm & Save"
        />
      </SafeAreaView>
    );
  }

  if (image) {
    const retrySource: IntakeSource = image.source === 'camera' ? 'camera' : 'gallery';
    const sourceLabel = image.source === 'camera' ? 'Camera' : 'Gallery';

    return (
      <ScreenShell scroll safeBottom={focusedScanFlow}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Check your image
          </Text>
          <Text style={styles.subtitle}>
            Make sure every instruction and deadline is clear before continuing.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Image
            accessibilityLabel="Selected assignment image preview"
            resizeMode="contain"
            source={{ uri: image.uri }}
            style={styles.previewImage}
          />
          <View style={styles.imageMetaRow}>
            <Text style={styles.sourceBadge}>{sourceLabel}</Text>
            <Text style={styles.imageMeta}>
              {image.width} × {image.height} px
            </Text>
          </View>
        </View>

        {image.qualityWarning && (
          <View accessibilityRole="alert" style={styles.warningCard}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.warning}
              name="warning-outline"
              size={24}
            />
            <Text style={styles.warningText}>{image.qualityWarning}</Text>
          </View>
        )}

        {image.wasResized && (
          <Text style={styles.helperText}>
            Duely reduced this large image to keep processing quick while preserving
            readable detail.
          </Text>
        )}

        {error && <ErrorMessage message={error} />}

        <PrimaryButton
          disabled={isProcessing}
          label="Extract text on this device"
          onPress={() => void startExtraction()}
        />

        {isProcessing && (
          <View
            accessibilityLabel="Preparing image"
            accessibilityRole="progressbar"
            style={styles.processingRow}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Preparing image locally…</Text>
          </View>
        )}

        <View style={styles.reviewActions}>
          <SecondaryButton
            disabled={isProcessing}
            icon="refresh-outline"
            label="Rotate"
            onPress={() => void rotateImage()}
          />
          <SecondaryButton
            disabled={isProcessing}
            icon={retrySource === 'camera' ? 'camera-outline' : 'images-outline'}
            label={retrySource === 'camera' ? 'Retake / crop' : 'Choose / crop again'}
            onPress={() => void beginSource(retrySource)}
          />
        </View>
        <TextButton danger disabled={isProcessing} label="Remove image" onPress={removeImage} />
      </ScreenShell>
    );
  }

  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <ActivityIndicator accessibilityLabel="Checking camera access" color={colors.surface} />
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.cameraPermissionScreen}>
        <View style={[styles.cameraTopBar, { top: insets.top }]}>
          <CameraControl
            icon="arrow-back"
            label="Return Home"
            onPress={() => router.replace('/')}
          />
          <Text accessibilityRole="header" style={styles.cameraHeaderTitle}>
            Scan Assignment
          </Text>
          <View style={styles.cameraTopSpacer} />
        </View>
        <View style={styles.cameraPermissionContent}>
          <View style={styles.cameraPermissionIcon}>
            <Ionicons
              accessibilityElementsHidden
              color="#AAB5FF"
              name="camera-outline"
              size={40}
            />
          </View>
          <Text style={styles.cameraPermissionTitle}>Camera access needed</Text>
          <Text style={styles.cameraPermissionBody}>
            Duely uses the camera only while you photograph one assignment. The image
            stays on this phone during preparation.
          </Text>
          <PrimaryButton
            label={cameraPermission.canAskAgain ? 'Enable camera' : 'Open device settings'}
            onPress={() =>
              cameraPermission.canAskAgain
                ? void requestAndLaunch('camera')
                : void Linking.openSettings()
            }
          />
          <SecondaryButton
            icon="images-outline"
            label="Choose from Gallery"
            onPress={() => void beginSource('gallery')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.cameraScreen}>
      <CameraView
        facing="back"
        flash={flashMode}
        mode="picture"
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={() => setError('The camera is unavailable. Try Gallery instead.')}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.cameraShadeTop} />
      <View pointerEvents="none" style={styles.cameraShadeBottom} />

      <View style={[styles.cameraTopBar, { top: insets.top }]}>
        <CameraControl
          icon="arrow-back"
          label="Return Home"
          onPress={() => router.replace('/')}
        />
        <Text accessibilityRole="header" style={styles.cameraHeaderTitle}>
          Scan Assignment
        </Text>
        <View style={styles.cameraTopSpacer} />
      </View>

      <View pointerEvents="none" style={styles.cameraGuide}>
        <View style={[styles.cameraCorner, styles.cameraCornerTopLeft]} />
        <View style={[styles.cameraCorner, styles.cameraCornerTopRight]} />
        <View style={[styles.cameraCorner, styles.cameraCornerBottomLeft]} />
        <View style={[styles.cameraCorner, styles.cameraCornerBottomRight]} />
      </View>

      <View pointerEvents="none" style={styles.cameraInstruction}>
        <Text style={styles.cameraInstructionTitle}>Point camera at your assignment</Text>
        <Text style={styles.cameraInstructionBody}>
          Images only · Keep the whole page inside the frame
        </Text>
      </View>

      {error && (
        <View style={styles.cameraError}>
          <Ionicons
            accessibilityElementsHidden
            color="#FFD5D8"
            name="alert-circle-outline"
            size={20}
          />
          <Text style={styles.cameraErrorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.cameraControls, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <CameraControl
          icon="images-outline"
          label="Gallery"
          onPress={() => void beginSource('gallery')}
          showLabel
        />
        <Pressable
          accessibilityLabel="Take assignment photo"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isCameraReady || isProcessing }}
          disabled={!isCameraReady || isProcessing}
          onPress={() => void captureAssignment()}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && styles.shutterPressed,
            (!isCameraReady || isProcessing) && styles.disabled,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
        <CameraControl
          active={flashMode === 'on'}
          icon={flashMode === 'on' ? 'flash' : 'flash-outline'}
          label={flashMode === 'on' ? 'Flash on' : 'Flash off'}
          onPress={() => setFlashMode((current) => (current === 'on' ? 'off' : 'on'))}
          showLabel
        />
      </View>
    </SafeAreaView>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function CameraControl({
  active = false,
  icon,
  label,
  onPress,
  showLabel = false,
}: {
  active?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  showLabel?: boolean;
}) {
  return (
    <View style={styles.cameraControlGroup}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.cameraControl,
          active && styles.cameraControlActive,
          pressed && styles.cameraControlPressed,
        ]}
      >
        <Ionicons accessibilityElementsHidden color={colors.surface} name={icon} size={24} />
      </Pressable>
      {showLabel && <Text style={styles.cameraControlLabel}>{label}</Text>}
    </View>
  );
}

function SecondaryButton({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon?: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && (
        <Ionicons accessibilityElementsHidden color={colors.primary} name={icon} size={21} />
      )}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function ProgressStep({
  active,
  complete,
  label,
}: {
  active: boolean;
  complete: boolean;
  label: string;
}) {
  const state = complete ? 'complete' : active ? 'in progress' : 'waiting';
  return (
    <View accessibilityLabel={`${label}, ${state}`} style={styles.progressStep}>
      <View
        style={[
          styles.progressStepIcon,
          (active || complete) && styles.progressStepIconActive,
        ]}
      >
        {complete ? (
          <Ionicons
            accessibilityElementsHidden
            color={colors.surface}
            name="checkmark"
            size={17}
          />
        ) : active ? (
          <ActivityIndicator color={colors.surface} size="small" />
        ) : (
          <View style={styles.progressStepDot} />
        )}
      </View>
      <Text
        style={[
          styles.progressStepText,
          (active || complete) && styles.progressStepTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function TextButton({
  danger = false,
  disabled = false,
  label,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.textButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.textButtonLabel, danger && styles.textButtonLabelDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.errorCard}>
      <Ionicons accessibilityElementsHidden color={colors.danger} name="alert-circle-outline" size={24} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: spacing.xs },
  title: { color: colors.text, fontFamily: typography.headingStrong, fontSize: 30 },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
  },
  cameraScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090A17',
  },
  cameraPermissionScreen: { flex: 1, backgroundColor: '#0D0F20' },
  cameraPermissionContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  cameraPermissionIcon: {
    width: 76,
    height: 76,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(91, 111, 232, 0.18)',
  },
  cameraPermissionTitle: {
    color: colors.surface,
    fontFamily: typography.headingStrong,
    fontSize: 26,
    textAlign: 'center',
  },
  cameraPermissionBody: {
    color: '#CDD3E8',
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  cameraTopBar: {
    position: 'absolute',
    zIndex: 4,
    top: 0,
    right: 0,
    left: 0,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cameraHeaderTitle: {
    color: colors.surface,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  cameraTopSpacer: { width: minimumTouchTarget, height: minimumTouchTarget },
  cameraShadeTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 132,
    backgroundColor: 'rgba(3, 5, 18, 0.52)',
  },
  cameraShadeBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '34%',
    backgroundColor: 'rgba(3, 5, 18, 0.68)',
  },
  cameraGuide: {
    position: 'absolute',
    top: '17%',
    right: spacing.xl,
    bottom: '34%',
    left: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.lg,
  },
  cameraCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#7184FF',
  },
  cameraCornerTopLeft: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
  cameraCornerTopRight: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
  cameraCornerBottomLeft: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
  cameraCornerBottomRight: { right: -1, bottom: -1, borderRightWidth: 3, borderBottomWidth: 3 },
  cameraInstruction: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 164,
    left: spacing.lg,
    alignItems: 'center',
  },
  cameraInstructionTitle: {
    color: colors.surface,
    fontFamily: typography.bodySemibold,
    fontSize: 16,
    textAlign: 'center',
  },
  cameraInstructionBody: {
    marginTop: spacing.xs,
    color: '#B9BED0',
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  cameraError: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 218,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 173, 181, 0.45)',
    borderRadius: radius.md,
    backgroundColor: 'rgba(91, 20, 31, 0.88)',
  },
  cameraErrorText: {
    flex: 1,
    color: '#FFF2F3',
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  cameraControls: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(3, 5, 18, 0.78)',
  },
  cameraControlGroup: { width: 76, alignItems: 'center', gap: spacing.xs },
  cameraControl: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.full,
    backgroundColor: 'rgba(9, 10, 23, 0.74)',
  },
  cameraControlActive: {
    borderColor: '#AAB5FF',
    backgroundColor: colors.primary,
  },
  cameraControlPressed: { opacity: 0.72 },
  cameraControlLabel: {
    color: colors.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  shutterOuter: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.surface,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 16 },
  cardTitle: { color: colors.text, fontFamily: typography.heading, fontSize: 18, textAlign: 'center' },
  cardBody: { marginTop: spacing.sm, color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  fileRule: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  permissionCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  previewCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: '#10101F',
  },
  previewImage: { width: '100%', height: 360, backgroundColor: '#10101F' },
  imageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  sourceBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  imageMeta: { flexShrink: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 13, textAlign: 'right' },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#F4C98B',
    borderRadius: radius.lg,
    backgroundColor: '#FFF7E8',
  },
  warningText: { flex: 1, color: colors.warning, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#F2B8B8',
    borderRadius: radius.lg,
    backgroundColor: '#FFF0F0',
  },
  errorText: { flex: 1, color: colors.danger, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  successState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  successIcon: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: '#EAF9F0',
  },
  successBody: {
    maxWidth: 420,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  progressState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: spacing.lg,
  },
  progressRings: {
    width: 184,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingOuter: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderWidth: 2,
    borderColor: '#C8CEFF',
    borderRadius: 92,
  },
  progressRingMiddle: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderWidth: 2,
    borderColor: '#B5BEFF',
    borderRadius: 71,
  },
  progressRingInner: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderWidth: 2,
    borderColor: '#AAB5FF',
    borderRadius: 51,
    backgroundColor: '#DDE2FF',
  },
  progressMascot: { width: 86, height: 86, zIndex: 1 },
  progressTitle: {
    marginTop: spacing.xl,
    color: colors.text,
    fontFamily: typography.headingStrong,
    fontSize: 24,
    textAlign: 'center',
  },
  progressBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  progressSteps: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: '#F1F3FF',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressStepIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
  },
  progressStepIconActive: { backgroundColor: colors.primary },
  progressStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressStepText: { flex: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 16 },
  progressStepTextActive: { color: colors.text, fontFamily: typography.bodySemibold },
  recoveryState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  recoveryBody: {
    maxWidth: 440,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  reviewSafeArea: { flex: 1, backgroundColor: colors.background },
  reviewHeader: { gap: spacing.md, paddingBottom: spacing.xs },
  reviewPrivacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  reviewPrivacyBody: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  allowanceText: {
    color: colors.textMuted,
    fontFamily: typography.bodySemibold,
    fontSize: 13,
    lineHeight: 19,
  },
  helperText: { flexShrink: 1, color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
  processingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  reviewActions: { gap: spacing.sm },
  secondaryButton: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { flexShrink: 1, color: colors.primary, fontFamily: typography.bodyBold, fontSize: 16, textAlign: 'center' },
  textButton: {
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  textButtonLabel: { color: colors.primary, fontFamily: typography.bodyBold, fontSize: 15 },
  textButtonLabelDanger: { color: colors.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
