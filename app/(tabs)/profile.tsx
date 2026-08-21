import { EmptyState } from '../../src/components/EmptyState'; import { ScreenShell } from '../../src/components/ScreenShell';
export default function ProfileScreen() { return <ScreenShell><EmptyState title="Continue as a guest" description="Your local tasks stay on this device. Account options arrive with Supabase authentication." /></ScreenShell>; }
