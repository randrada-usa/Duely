import { Directory, File, Paths } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenShell } from '../src/components/ScreenShell';
import {
  evaluateNativeOcrObservations,
  type NativeOcrEvaluationReport,
  type NativeOcrObservation,
} from '../src/domain/nativeOcrEvaluation';
import { NATIVE_OCR_IMAGE_FIXTURES } from '../src/domain/nativeOcrImageFixtures';
import {
  evaluatePrivateOcrObservations,
  type PrivateOcrEvaluationReport,
  type PrivateOcrFixture,
  type PrivateOcrObservation,
} from '../src/domain/privateOcrEvaluation';
import { startOnDeviceOcr, supportsOnDeviceOcr } from '../src/services/ocr';
import { colors, radius, spacing } from '../src/theme/tokens';

const FIXTURE_DIRECTORY = 'ocr-evaluation';
const REPORT_FILENAME = 'ocr-evaluation-report.json';
const EVALUATION_NOW = new Date(2026, 7, 25, 12, 0, 0);

type EvaluationState = 'idle' | 'running' | 'complete' | 'error';

type EvaluationReport = NativeOcrEvaluationReport | PrivateOcrEvaluationReport;

function writeReport(report: EvaluationReport | { status: 'failed'; error: string }) {
  const output = new File(Paths.document, REPORT_FILENAME);
  output.create({ overwrite: true });
  output.write(JSON.stringify(report, null, 2));
}

export default function OcrEvaluationScreen() {
  const { autorun, mode } = useLocalSearchParams<{ autorun?: string; mode?: string }>();
  const [state, setState] = useState<EvaluationState>('idle');
  const [completed, setCompleted] = useState(0);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutomaticRun = useRef<string | null>(null);

  const runEvaluation = useCallback(async () => {
    if (!__DEV__) {
      setError('This evaluation tool is available only in development builds.');
      setState('error');
      return;
    }
    if (!supportsOnDeviceOcr()) {
      const message = 'Native ML Kit OCR is unavailable in this build.';
      writeReport({ status: 'failed', error: message });
      setError(message);
      setState('error');
      return;
    }

    setState('running');
    setCompleted(0);
    setError(null);
    setReport(null);
    const fixtureDirectory = new Directory(Paths.document, FIXTURE_DIRECTORY);
    const isPrivateEvaluation = mode === 'private';

    try {
      let fixtures: readonly (typeof NATIVE_OCR_IMAGE_FIXTURES)[number][] | PrivateOcrFixture[] = NATIVE_OCR_IMAGE_FIXTURES;
      if (isPrivateEvaluation) {
        const manifest = new File(fixtureDirectory, 'manifest.json');
        if (!manifest.exists) throw new Error('Private evaluation manifest is missing.');
        fixtures = JSON.parse(await manifest.text()) as PrivateOcrFixture[];
      }
      const observations: Array<NativeOcrObservation | PrivateOcrObservation> = [];

      for (const fixture of fixtures) {
        const image = new File(fixtureDirectory, fixture.filename);
        if (!image.exists) {
          observations.push({
            fixtureId: fixture.id,
            recognizedText: null,
            durationMs: 0,
            error: 'fixture-missing',
          });
          setCompleted((value) => value + 1);
          continue;
        }

        const startedAt = Date.now();
        try {
          const recognition = await startOnDeviceOcr(image.uri).result;
          observations.push({
            fixtureId: fixture.id,
            recognizedText: recognition.text,
            durationMs: Date.now() - startedAt,
          });
        } catch {
          observations.push({
            fixtureId: fixture.id,
            recognizedText: null,
            durationMs: Date.now() - startedAt,
            error: 'recognition-failed',
          });
        }
        setCompleted((value) => value + 1);
      }

      const nextReport = isPrivateEvaluation
        ? evaluatePrivateOcrObservations(
            fixtures as PrivateOcrFixture[],
            observations as PrivateOcrObservation[],
            EVALUATION_NOW,
          )
        : evaluateNativeOcrObservations(
            fixtures as typeof NATIVE_OCR_IMAGE_FIXTURES,
            observations as NativeOcrObservation[],
            EVALUATION_NOW,
          );
      writeReport(nextReport);
      setReport(nextReport);
      setState('complete');
    } catch {
      const message = 'The Android OCR evaluation could not finish.';
      writeReport({ status: 'failed', error: message });
      setError(message);
      setState('error');
    }
  }, [mode]);

  useEffect(() => {
    if (!autorun || autorun === lastAutomaticRun.current) return;
    lastAutomaticRun.current = autorun;
    void runEvaluation();
  }, [autorun, runEvaluation]);

  if (!__DEV__) {
    return (
      <ScreenShell>
        <Text style={styles.title}>Evaluation unavailable</Text>
        <Text style={styles.body}>This internal tool is excluded from release behavior.</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll>
      <Text accessibilityRole="header" style={styles.title}>Android OCR evaluation</Text>
      <Text style={styles.body}>
        {mode === 'private'
          ? 'Runs local private samples through bundled ML Kit. Images and full recognized text are not written to the report.'
          : 'Runs 12 synthetic assignment images through bundled ML Kit. Images and full recognized text are not written to the report.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {state === 'running'
            ? `Processing ${completed} ${mode === 'private' ? 'private samples' : `of ${NATIVE_OCR_IMAGE_FIXTURES.length}`}`
            : state === 'complete'
              ? 'Evaluation complete'
              : state === 'error'
                ? 'Evaluation stopped'
                : 'Ready to run'}
        </Text>
        {state === 'running' && <Text style={styles.body}>Keep this screen open.</Text>}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {report && 'parser' in report && (
          <View style={styles.metrics}>
            <Text style={styles.metric}>OCR completed: {report.recognition.completed}/{report.fixtureCount}</Text>
            <Text style={styles.metric}>Token accuracy: {Math.round(report.recognition.tokenAccuracy * 100)}%</Text>
            <Text style={styles.metric}>Exact token sequence: {report.recognition.exactTokenSequenceMatches}/{report.fixtureCount}</Text>
            <Text style={styles.metric}>Parser-ready fixtures: {report.parser.metrics.essentialFieldAccuracy.passed}/{report.fixtureCount}</Text>
          </View>
        )}
        {report && 'deadlineChecks' in report && (
          <View style={styles.metrics}>
            <Text style={styles.metric}>OCR completed: {report.recognition.completed}/{report.fixtureCount}</Text>
            <Text style={styles.metric}>Deadline checks passed: {report.deadlineChecks.passed}</Text>
            <Text style={styles.metric}>Deadline checks failed: {report.deadlineChecks.failed}</Text>
            <Text style={styles.metric}>Manual review cases: {report.deadlineChecks.manualReview}</Text>
          </View>
        )}
      </View>

      <PrimaryButton
        disabled={state === 'running'}
        label={state === 'running' ? 'Evaluation running' : `Run ${mode === 'private' ? 'private' : 'synthetic'} image evaluation`}
        onPress={() => void runEvaluation()}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  metrics: { gap: spacing.sm },
  metric: { color: colors.text, fontSize: 16, lineHeight: 23 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23 },
});
