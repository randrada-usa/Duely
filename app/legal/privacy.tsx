import { BetaLegalNotice, type LegalSection } from '../../src/components/BetaLegalNotice';

const sections: LegalSection[] = [
  {
    heading: 'Guest and local use',
    body: 'Manual tasks and on-device text recognition are available without an account. Guest task data stays on the device unless you later sign in and explicitly choose a cloud feature.',
  },
  {
    heading: 'Google sign-in',
    body: 'When you continue with Google, Duely uses the account information returned by Google to identify your Duely account. Duely does not ask for or store your Google password.',
  },
  {
    heading: 'Assignment images and OCR',
    body: 'Duely runs text recognition on the device first. Temporary scan material is used to build the editable review and is cleared when you save or re-scan. Avoid including unrelated names, faces, student numbers, contact details, or conversations in a scan.',
  },
  {
    heading: 'Optional AI Assist',
    body: 'AI Assist requires sign-in and a separate processing choice. When enabled, Duely sends recognized text—not the assignment image—to the server-side Gemini integration to suggest task fields. You still review every suggestion before saving.',
  },
  {
    heading: 'Model improvement',
    body: 'Using the beta or AI Assist does not automatically allow Duely to use your scans for model improvement. That requires a separate, optional consent that can be withdrawn.',
  },
  {
    heading: 'Permissions and reminders',
    body: 'Camera access is requested when you choose to capture an assignment. Notification access is used only for task reminders you choose. You can decline either permission and continue using manual task creation.',
  },
  {
    heading: 'Test purchases',
    body: 'In development builds, RevenueCat receives the signed-in Duely account identifier to associate and restore a simulated Duely Plus entitlement. The Test Store does not charge real money.',
  },
  {
    heading: 'Your beta controls',
    body: 'You can sign out and change AI consent choices in the app. Full account export and deletion tools are still being finalized for the beta, so do not use this competition build as the only place you keep important information.',
  },
];

export default function BetaPrivacyScreen() {
  return (
    <BetaLegalNotice
      introduction="This notice summarizes how the current Duely beta handles account information, assignment scans, permissions, AI processing, and test purchases."
      sections={sections}
      title="Beta Privacy Notice"
    />
  );
}
