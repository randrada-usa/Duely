import {
  isSupported as isMlKitSupported,
  recognizeText,
  type RecognitionResult,
} from 'expo-mlkit-ocr';
import { Platform } from 'react-native';

export class OcrCancelledError extends Error {
  constructor() {
    super('Text extraction was cancelled.');
    this.name = 'OcrCancelledError';
  }
}

export type OcrRun = {
  cancel: () => void;
  result: Promise<RecognitionResult>;
};

export function supportsOnDeviceOcr() {
  if (Platform.OS === 'web') return false;
  try {
    return isMlKitSupported();
  } catch {
    return false;
  }
}

export function startOnDeviceOcr(uri: string): OcrRun {
  let cancelled = false;

  return {
    cancel: () => {
      cancelled = true;
    },
    result: (async () => {
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        throw new Error('The prepared image is unavailable. Choose it again.');
      }
      if (!supportsOnDeviceOcr()) {
        throw new Error(
          'On-device text extraction is not available in this build. Use an Android development build and try again.',
        );
      }

      try {
        const recognition = await recognizeText(uri);
        if (cancelled) throw new OcrCancelledError();
        return recognition;
      } catch (error) {
        if (cancelled || error instanceof OcrCancelledError) {
          throw new OcrCancelledError();
        }
        throw new Error(
          'Duely could not read text from this image. Check the image and try again.',
        );
      }
    })(),
  };
}
