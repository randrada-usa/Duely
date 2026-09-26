export const MAX_SCAN_IMAGE_EDGE = 2_400;
export const MIN_READABLE_SCAN_EDGE = 900;

export type ScanImageSource = 'camera' | 'gallery' | 'recovered';

export type PickedImageCandidate = {
  type?: string | null;
  mimeType?: string | null;
  width: number;
  height: number;
};

export type ScanImageAsset = PickedImageCandidate & { uri: string };

export type PreparedScanImage = {
  uri: string;
  width: number;
  height: number;
  source: ScanImageSource;
  wasResized: boolean;
  qualityWarning: string | null;
};

export function pickedImageError(
  assets: readonly PickedImageCandidate[] | null,
) {
  if (!assets || assets.length !== 1) {
    return 'Choose exactly one assignment image.';
  }

  const [asset] = assets;
  if (
    (asset.type !== undefined &&
      asset.type !== null &&
      asset.type !== 'image') ||
    (asset.mimeType !== undefined &&
      asset.mimeType !== null &&
      !asset.mimeType.toLowerCase().startsWith('image/'))
  ) {
    return 'Choose an image file. PDFs and documents are not supported.';
  }

  return null;
}

export function scanImageResize(width: number, height: number) {
  if (width <= 0 || height <= 0) return null;
  if (width <= MAX_SCAN_IMAGE_EDGE && height <= MAX_SCAN_IMAGE_EDGE) {
    return null;
  }

  return width >= height
    ? { width: MAX_SCAN_IMAGE_EDGE }
    : { height: MAX_SCAN_IMAGE_EDGE };
}

export function scanImageQualityWarning(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return 'Duely could not confirm the image size. Check that every line of text is readable.';
  }

  if (Math.min(width, height) < MIN_READABLE_SCAN_EDGE) {
    return 'This image may be too small for reliable text reading. Try a closer, sharper photo.';
  }

  if (Math.max(width, height) / Math.min(width, height) > 3) {
    return 'This image is unusually narrow. Check that the full assignment is inside the frame.';
  }

  return null;
}
