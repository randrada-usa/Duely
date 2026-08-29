import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import { TaskForm } from '../../src/components/TaskForm';
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
  cleanupAbandonedScanImages,
  deleteTemporaryScanImage,
  prepareScanImage,
  rotateScanImage,
} from '../../src/services/scanImage';
import { useReminders } from '../../src/store/ReminderStore';
import { useTasks } from '../../src/store/TaskStore';
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
  const navigation = useNavigation();
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
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const activeImageUri = useRef<string | null>(null);
  const activeOcrRun = useRef<OcrRun | null>(null);
  const isMounted = useRef(true);
  const focusedScanFlow = permissionIssue !== null || image !== null || scanStage !== 'image';

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: focusedScanFlow ? { display: 'none' } : undefined,
    });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [focusedScanFlow, navigation]);

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
      deleteTemporaryScanImage(activeImageUri.current);
    };
  }, [acceptPickerResult]);

  async function launchSource(source: IntakeSource) {
    setIsProcessing(true);
    setError(null);
    try {
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      await acceptPickerResult(result, source);
    } catch {
      setError(
        source === 'camera'
          ? 'Duely could not open the camera. Try again or choose from Gallery.'
          : 'Duely could not open Gallery. Try again or use the camera.',
      );
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }

  async function requestAndLaunch(source: IntakeSource) {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.granted) {
        setPermissionIssue(null);
        await launchSource(source);
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
            onPress: () => void launchSource('gallery'),
          },
        ],
      );
      return;
    }

    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.getCameraPermissionsAsync()
          : await ImagePicker.getMediaLibraryPermissionsAsync();

      if (permission.granted) {
        await launchSource(source);
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
          ? await ImagePicker.getCameraPermissionsAsync()
          : await ImagePicker.getMediaLibraryPermissionsAsync();

      if (permission.granted) {
        const source = permissionIssue.source;
        setPermissionIssue(null);
        await launchSource(source);
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
      setScanStage('review');
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

  function retryWith(source: IntakeSource) {
    setError(null);
    setExtraction(null);
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

    const provenance = buildMlKitProvenance(extraction, {
      title: draft.title,
      subject: subjectName,
      dueAt: draft.dueAt,
      taskType: draft.taskType,
      priority: draft.priority,
      estimatedEffortMinutes: draft.estimatedEffortMinutes,
      notes: draft.notes,
    });
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
    setError(null);
    setSavedTaskId(saved.id);
    setScanStage('saved');
  }

  if (scanStage === 'saved' && savedTaskId) {
    return (
      <ScreenShell scroll>
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
      <ScreenShell scroll>
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
        <TextButton label="Back to choices" onPress={() => setPermissionIssue(null)} />
      </ScreenShell>
    );
  }

  if (image && scanStage === 'processing') {
    const organizing = ocrProgressStep === 'organizing';
    return (
      <ScreenShell scroll>
        <View accessibilityLiveRegion="polite" style={styles.progressState}>
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
      <ScreenShell scroll>
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
    const values = scanReviewValues(extraction);
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
      <SafeAreaView style={styles.reviewSafeArea}>
        <TaskForm
          defaultReminder={defaultReminder}
          fieldNotices={extraction.issues}
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
              <View style={styles.reviewTitleRow}>
                <Pressable
                  accessibilityHint="Discard extraction edits and return to the selected image"
                  accessibilityLabel="Back to image review"
                  accessibilityRole="button"
                  onPress={confirmReturnToImage}
                  style={({ pressed }) => [
                    styles.reviewBackButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.text}
                    name="chevron-back"
                    size={23}
                  />
                </Pressable>
                <View style={styles.reviewTitleCopy}>
                  <Text
                    accessibilityRole="header"
                    style={[styles.title, styles.reviewTitle]}
                  >
                    Review extraction
                  </Text>
                  <Text style={styles.subtitle}>
                    Fields marked with a warning need your attention.
                  </Text>
                </View>
              </View>
              <View style={styles.reviewPreviewRow}>
                <Image
                  accessibilityLabel="Source assignment image preview"
                  resizeMode="cover"
                  source={{ uri: image.uri }}
                  style={styles.reviewPreview}
                />
                <View style={styles.reviewPrivacyCopy}>
                  <Text style={styles.reviewPrivacyTitle}>On-device extraction</Text>
                  <Text style={styles.reviewPrivacyBody}>
                    Raw recognized text and the temporary image are cleared after you save or re-scan.
                  </Text>
                </View>
              </View>
              {error && <ErrorMessage message={error} />}
            </View>
          }
          initial={initial}
          initialSubjectName={matchingSubject ? '' : values.subject}
          key={`${image.uri}-${extraction.rawText.length}`}
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
      <ScreenShell scroll>
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
          <View accessibilityLabel="Preparing image" style={styles.processingRow}>
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

  return (
    <ScreenShell scroll>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Scan Assignment
        </Text>
        <Text style={styles.subtitle}>
          Turn one clear assignment image into an editable task.
        </Text>
      </View>

      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <Ionicons
          accessibilityElementsHidden
          color="#AAB5FF"
          name="scan-outline"
          size={62}
        />
        <View style={styles.scanLine} />
        <Text style={styles.viewfinderTitle}>Keep the whole assignment in frame</Text>
        <Text style={styles.viewfinderBody}>
          Use bright, even light and avoid shadows over the text.
        </Text>
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />
      </View>

      <View style={styles.choiceRow}>
        <SourceCard
          description="Take a new photo"
          icon="camera-outline"
          label="Camera"
          onPress={() => void beginSource('camera')}
        />
        <SourceCard
          description="Choose one image"
          icon="images-outline"
          label="Gallery"
          onPress={() => void beginSource('gallery')}
        />
      </View>

      {error && <ErrorMessage message={error} />}

      {isProcessing && (
        <View accessibilityLabel="Restoring image selection" style={styles.processingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helperText}>Preparing image locally…</Text>
        </View>
      )}

      <View style={styles.privacyCard}>
        <Ionicons
          accessibilityElementsHidden
          color={colors.primary}
          name="shield-checkmark-outline"
          size={26}
        />
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Private by default</Text>
          <Text style={styles.cardBody}>
            Image preparation is local. Nothing is uploaded during this flow.
          </Text>
        </View>
      </View>

      <Text style={styles.fileRule}>
        Images only · One assignment at a time · PDFs and documents are not supported
      </Text>
    </ScreenShell>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function SourceCard({
  description,
  icon,
  label,
  onPress,
}: {
  description: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.sourceCard, pressed && styles.pressed]}
    >
      <View style={styles.sourceIcon}>
        <Ionicons accessibilityElementsHidden color={colors.primary} name={icon} size={30} />
      </View>
      <Text style={styles.sourceTitle}>{label}</Text>
      <Text style={styles.sourceDescription}>{description}</Text>
    </Pressable>
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
  viewfinder: {
    minHeight: 310,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#2C3154',
    backgroundColor: '#111322',
  },
  viewfinderTitle: {
    marginTop: spacing.md,
    color: colors.surface,
    fontFamily: typography.heading,
    fontSize: 18,
    textAlign: 'center',
  },
  viewfinderBody: {
    marginTop: spacing.sm,
    color: '#CDD3FF',
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#8291FF',
  },
  cornerTopLeft: { top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTopRight: { top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBottomLeft: { bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBottomRight: { right: 20, bottom: 20, borderRightWidth: 3, borderBottomWidth: 3 },
  scanLine: {
    width: '76%',
    height: 2,
    marginTop: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    opacity: 0.78,
  },
  choiceRow: { flexDirection: 'row', gap: spacing.md },
  sourceCard: {
    minHeight: 154,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sourceIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  sourceTitle: { marginTop: spacing.md, color: colors.text, fontFamily: typography.bodyBold, fontSize: 17 },
  sourceDescription: { marginTop: 2, color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
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
  cardBody: { marginTop: spacing.xs, color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
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
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  reviewBackButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  reviewTitleCopy: { flex: 1 },
  reviewTitle: { fontSize: 22, lineHeight: 28 },
  reviewPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  reviewPreview: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: '#10101F',
  },
  reviewPrivacyCopy: { flex: 1 },
  reviewPrivacyTitle: { color: colors.text, fontFamily: typography.bodyBold, fontSize: 15 },
  reviewPrivacyBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
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
