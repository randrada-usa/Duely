import { describe, expect, it } from 'vitest';

import {
  buildCombinedProvenance,
  isGeminiScanExtraction,
  mergeGeminiExtraction,
  type GeminiScanExtraction,
} from './geminiExtraction';
import { extractTaskFromOcr, scanReviewValues } from './scanExtraction';

const gemini: GeminiScanExtraction = {
  title: { value: 'Cell Project', confidence: 'high' },
  subject: { value: 'BIO 101', confidence: 'high' },
  dueAt: { value: null, confidence: 'low' },
  taskType: { value: 'project', confidence: 'high' },
  priority: { value: 'high', confidence: 'medium' },
  estimatedEffortMinutes: { value: 120, confidence: 'medium' },
  notes: { value: 'Build a labeled model.', confidence: 'high' },
  hasMultipleAssignments: false,
};

describe('Gemini extraction', () => {
  it('rejects malformed server data', () => {
    expect(isGeminiScanExtraction(gemini)).toBe(true);
    expect(isGeminiScanExtraction({ ...gemini, priority: { value: 'urgent', confidence: 'high' } })).toBe(false);
  });

  it('fills missing fields and explicitly marks disagreements', () => {
    const local = extractTaskFromOcr('Title: Cell Activity\nSubject: BIO 101');
    const merged = mergeGeminiExtraction(local, gemini);

    expect(merged.fields.title?.value).toBe('Cell Activity');
    expect(merged.fields.taskType?.value).toBe('project');
    expect(merged.issues.title).toContain('disagreed');
    expect(merged.issues.notes).toContain('AI suggested');
  });

  it('records both engines and the final student decision', () => {
    const local = extractTaskFromOcr('Title: Cell Activity\nSubject: BIO 101');
    const merged = mergeGeminiExtraction(local, gemini);
    const confirmed = { ...scanReviewValues(merged), title: 'My final title' };
    const provenance = buildCombinedProvenance(local, gemini, confirmed, '2026-08-29T10:00:00.000Z');

    expect(provenance.title).toMatchObject({
      sources: ['ml-kit', 'gemini'],
      comparison: 'disagree',
      userAction: 'edited',
    });
    expect(provenance.notes).toMatchObject({
      sources: ['gemini'],
      comparison: 'not-compared',
      userAction: 'accepted',
    });
  });

  it('treats equivalent deadline offsets as agreement', () => {
    const local = extractTaskFromOcr(
      'Title: Lab report\nDue: August 30, 2026 11:00 PM',
      new Date('2026-08-29T12:00:00+08:00'),
    );
    const withEquivalentDeadline: GeminiScanExtraction = {
      ...gemini,
      dueAt: { value: '2026-08-30T15:00:00.000Z', confidence: 'high' },
    };
    const confirmed = scanReviewValues(
      mergeGeminiExtraction(local, withEquivalentDeadline),
    );

    expect(
      buildCombinedProvenance(local, withEquivalentDeadline, confirmed).dueAt
        ?.comparison,
    ).toBe('agree');
  });
});
