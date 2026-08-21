import { EmptyState } from '../../src/components/EmptyState'; import { ScreenShell } from '../../src/components/ScreenShell';
export default function CalendarScreen() { return <ScreenShell><EmptyState title="Your calendar is clear" description="Tasks with deadlines will appear here in the calendar milestone." /></ScreenShell>; }
