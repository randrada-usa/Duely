export type SessionBootstrapCallbacks<SessionValue> = {
  onSession: (session: SessionValue | null) => void;
  onError: () => void;
};

export const CURRENT_SESSION_SIGN_OUT_OPTIONS = { scope: 'local' } as const;

export function createSessionBootstrapCoordinator<SessionValue>({
  onSession,
  onError,
}: SessionBootstrapCallbacks<SessionValue>) {
  let active = true;
  let receivedAuthEvent = false;

  return {
    applyAuthEvent(session: SessionValue | null) {
      if (!active) return;
      receivedAuthEvent = true;
      onSession(session);
    },
    applySessionCheck(session: SessionValue | null, failed: boolean) {
      if (!active || receivedAuthEvent) return;
      if (failed) {
        onError();
        return;
      }
      onSession(session);
    },
    stop() {
      active = false;
    },
  };
}
