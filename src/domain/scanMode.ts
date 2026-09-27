export type ScanMode = 'ocr' | 'ai';
export type ScanModeBlocker = 'ai-disabled' | 'sign-in-required' | null;

export type ResolvedScanMode = {
  mode: ScanMode;
  blocker: ScanModeBlocker;
};

export function resolveScanMode(
  requestedMode: ScanMode,
  options: { aiAssistEnabled: boolean; authenticated: boolean },
): ResolvedScanMode {
  if (requestedMode === 'ocr') return { mode: 'ocr', blocker: null };
  if (!options.aiAssistEnabled) {
    return { mode: 'ocr', blocker: 'ai-disabled' };
  }
  if (!options.authenticated) {
    return { mode: 'ocr', blocker: 'sign-in-required' };
  }
  return { mode: 'ai', blocker: null };
}
