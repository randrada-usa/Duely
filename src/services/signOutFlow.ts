// Navigation waits for successful sign-out; local task storage is never touched.
export async function signOutToChoice(
  signOut: () => Promise<boolean>,
  showChoice: () => void,
  showError: () => void,
) {
  let signedOut = false;
  try {
    signedOut = await signOut();
  } catch {
    // Keep the current screen available for retry without exposing provider errors.
  }
  if (signedOut) showChoice();
  else showError();
}
