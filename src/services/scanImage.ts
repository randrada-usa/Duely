import { Directory, File, Paths } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
  type ImageManipulatorContext,
  type ImageRef,
} from 'expo-image-manipulator';
import {
  pickedImageError,
  scanImageQualityWarning,
  scanImageResize,
  type ScanImageAsset,
  type PreparedScanImage,
  type ScanImageSource,
} from '../domain/scanImage';

const MANAGED_SCAN_PREFIX = 'duely-scan-';

function releaseManipulation(
  context: ImageManipulatorContext | null,
  image: ImageRef | null,
) {
  try {
    image?.release();
  } catch {
    // A completed native image may already have been released by the platform.
  }
  try {
    context?.release();
  } catch {
    // Native cleanup is best-effort and must not replace the user-facing result.
  }
}

function deleteCacheFile(uri: string) {
  if (!uri.startsWith(Paths.cache.uri)) return;

  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best-effort and must not block the student's flow.
  }
}

function managedScanUri(uri: string) {
  const file = new File(uri);
  if (!file.exists) throw new Error('Prepared scan image is unavailable.');
  const destination = new File(
    Paths.cache,
    `${MANAGED_SCAN_PREFIX}${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.jpg`,
  );
  file.moveSync(destination);
  return file.uri;
}

function cleanupPickerCacheFiles() {
  try {
    const pickerCache = new Directory(Paths.cache, 'ImagePicker');
    if (!pickerCache.exists) return;

    for (const entry of pickerCache.list()) {
      if (entry instanceof File) entry.delete();
    }
  } catch {
    // Image-picker cache cleanup is best-effort after a selection completes.
  }
}

export async function prepareScanImage(
  asset: ScanImageAsset,
  source: ScanImageSource,
): Promise<PreparedScanImage> {
  const validationError = pickedImageError([asset]);
  if (validationError) throw new Error(validationError);

  let savedUri: string | null = null;
  let context: ImageManipulatorContext | null = null;
  let rendered: ImageRef | null = null;
  try {
    context = ImageManipulator.manipulate(asset.uri);
    const resize = scanImageResize(asset.width, asset.height);
    if (resize) context.resize(resize);

    rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      base64: false,
      compress: 0.9,
      format: SaveFormat.JPEG,
    });
    savedUri = saved.uri;
    const uri = managedScanUri(saved.uri);
    savedUri = uri;

    if (asset.uri !== uri) deleteCacheFile(asset.uri);
    cleanupPickerCacheFiles();

    return {
      uri,
      width: saved.width,
      height: saved.height,
      source,
      wasResized: resize !== null,
      qualityWarning: scanImageQualityWarning(saved.width, saved.height),
    };
  } catch (error) {
    if (savedUri) deleteCacheFile(savedUri);
    deleteCacheFile(asset.uri);
    cleanupPickerCacheFiles();
    if (error instanceof Error && error.message.startsWith('Choose ')) {
      throw error;
    }
    throw new Error(
      'Duely could not prepare this image. Try again or choose another image.',
    );
  } finally {
    releaseManipulation(context, rendered);
  }
}

export async function rotateScanImage(
  image: PreparedScanImage,
): Promise<PreparedScanImage> {
  let savedUri: string | null = null;
  let context: ImageManipulatorContext | null = null;
  let rendered: ImageRef | null = null;
  try {
    context = ImageManipulator.manipulate(image.uri);
    context.rotate(90);
    rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      base64: false,
      compress: 0.96,
      format: SaveFormat.JPEG,
    });
    savedUri = saved.uri;
    const uri = managedScanUri(saved.uri);
    savedUri = uri;
    deleteTemporaryScanImage(image.uri);

    return {
      ...image,
      uri,
      width: saved.width,
      height: saved.height,
      qualityWarning: scanImageQualityWarning(saved.width, saved.height),
    };
  } catch {
    if (savedUri) deleteCacheFile(savedUri);
    throw new Error('Duely could not rotate this image. Try again.');
  } finally {
    releaseManipulation(context, rendered);
  }
}

export function deleteTemporaryScanImage(uri: string | null | undefined) {
  if (!uri || !uri.startsWith(Paths.cache.uri)) return;

  try {
    const file = new File(uri);
    if (!file.name.startsWith(MANAGED_SCAN_PREFIX)) return;
    if (file.exists) file.delete();
  } catch {
    // The OS may have already cleared this cache file.
  }
}

export function cleanupAbandonedScanImages(activeUri?: string | null) {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File) {
        if (
          entry.uri !== activeUri &&
          entry.name.startsWith(MANAGED_SCAN_PREFIX)
        ) {
          entry.delete();
        }
        continue;
      }

      for (const nestedEntry of entry.list()) {
        if (
          nestedEntry instanceof File &&
          nestedEntry.uri !== activeUri &&
          nestedEntry.name.startsWith(MANAGED_SCAN_PREFIX)
        ) {
          nestedEntry.delete();
        }
      }
    }
    cleanupPickerCacheFiles();
  } catch {
    // A cleanup failure should not make image intake unavailable.
  }
}
