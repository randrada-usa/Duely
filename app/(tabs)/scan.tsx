import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
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

import { PrimaryButton } from '../../src/components/PrimaryButton';
import { ScreenShell } from '../../src/components/ScreenShell';
import {
  pickedImageError,
  type PreparedScanImage,
  type ScanImageSource,
} from '../../src/domain/scanImage';
import {
  cleanupAbandonedScanImages,
  deleteTemporaryScanImage,
  prepareScanImage,
  rotateScanImage,
} from '../../src/services/scanImage';
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from '../../src/theme/tokens';

type IntakeSource = 'camera' | 'gallery';
type PermissionIssue = { source: IntakeSource; canAskAgain: boolean };

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
  const [image, setImage] = useState<PreparedScanImage | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionIssue, setPermissionIssue] =
    useState<PermissionIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeImageUri = useRef<string | null>(null);
  const isMounted = useRef(true);

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
        setIsConfirmed(false);
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
      setIsConfirmed(false);
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
    deleteTemporaryScanImage(activeImageUri.current);
    activeImageUri.current = null;
    setImage(null);
    setIsConfirmed(false);
    setError(null);
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

  if (image) {
    const retrySource: IntakeSource = image.source === 'camera' ? 'camera' : 'gallery';
    const sourceLabel = image.source === 'camera' ? 'Camera' : 'Gallery';

    return (
      <ScreenShell scroll>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {isConfirmed ? 'Image ready' : 'Check your image'}
          </Text>
          <Text style={styles.subtitle}>
            {isConfirmed
              ? 'Your assignment image is prepared locally for text extraction.'
              : 'Make sure every instruction and deadline is clear before continuing.'}
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

        {isConfirmed ? (
          <View style={styles.readyCard}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.success}
              name="checkmark-circle"
              size={30}
            />
            <View style={styles.readyCopy}>
              <Text style={styles.readyTitle}>Ready for extraction</Text>
              <Text style={styles.cardBody}>
                OCR and editable extracted fields arrive in the next scanning step.
              </Text>
            </View>
          </View>
        ) : (
          <PrimaryButton
            disabled={isProcessing}
            label="Use this image"
            onPress={() => setIsConfirmed(true)}
          />
        )}

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
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  viewfinder: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#1A1A2E',
  },
  viewfinderTitle: {
    marginTop: spacing.md,
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  viewfinderBody: {
    marginTop: spacing.sm,
    color: '#CDD3FF',
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
  sourceTitle: { marginTop: spacing.md, color: colors.text, fontSize: 17, fontWeight: '800' },
  sourceDescription: { marginTop: 2, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  cardBody: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  fileRule: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
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
    fontSize: 13,
    fontWeight: '800',
  },
  imageMeta: { flexShrink: 1, color: colors.textMuted, fontSize: 13, textAlign: 'right' },
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
  warningText: { flex: 1, color: colors.warning, fontSize: 15, lineHeight: 22 },
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
  errorText: { flex: 1, color: colors.danger, fontSize: 15, lineHeight: 22 },
  readyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#EAF9F0',
  },
  readyCopy: { flex: 1 },
  readyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  helperText: { flexShrink: 1, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
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
  secondaryButtonText: { flexShrink: 1, color: colors.primary, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  textButton: {
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  textButtonLabel: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  textButtonLabelDanger: { color: colors.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
