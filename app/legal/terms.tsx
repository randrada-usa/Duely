import { BetaLegalNotice, type LegalSection } from '../../src/components/BetaLegalNotice';

const sections: LegalSection[] = [
  {
    heading: 'Beta purpose',
    body: 'Duely is an educational task-organizing beta. Features may change, pause, or behave differently while the app is being tested and prepared for release.',
  },
  {
    heading: 'Review before saving',
    body: 'On-device text recognition and optional AI Assist can make mistakes. You are responsible for reviewing the title, deadline, reminders, and other suggested details before saving a task.',
  },
  {
    heading: 'Accounts and guest access',
    body: 'You may use manual tasks and on-device scanning as a guest. Google sign-in is required for optional account features such as AI Assist. Do not attempt to access another person’s account or misuse Duely.',
  },
  {
    heading: 'Duely Plus test plan',
    body: 'The current Shipaton build uses RevenueCat Test Store. Purchases are simulated, no real money is charged, and test access is not a production subscription.',
  },
  {
    heading: 'Responsible use',
    body: 'Use Duely only for lawful educational planning. Do not submit content you do not have permission to use, attempt to bypass allowances or security, or use the service to harm another person.',
  },
  {
    heading: 'Availability',
    body: 'Because this is a beta, Duely is provided for testing without a promise of uninterrupted availability. Keep your own copy of important assignment instructions and deadlines.',
  },
];

export default function BetaTermsScreen() {
  return (
    <BetaLegalNotice
      introduction="These Beta Terms explain the basic rules for using the current Duely competition and testing build. Continuing means you agree to these terms."
      sections={sections}
      title="Beta Terms"
    />
  );
}
