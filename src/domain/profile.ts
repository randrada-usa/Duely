export function googleProfilePhotoUrl(
  metadata: Record<string, unknown> | undefined,
) {
  const candidate = metadata?.avatar_url ?? metadata?.picture;
  if (typeof candidate !== 'string') return null;

  const trimmed = candidate.trim();
  return trimmed.startsWith('https://') ? trimmed : null;
}
