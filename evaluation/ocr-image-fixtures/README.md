# Android OCR Image Evaluation

This development-only harness renders 12 synthetic assignment pages and sends
them through Duely's bundled ML Kit integration on an Android emulator or
device. It covers English, Filipino, and mixed-language examples with explicit,
missing, and ambiguous deadlines.

The images are generated under ignored `.expo/` storage. The runner copies them
temporarily into the app's private files directory, reads the privacy-safe JSON
report, and removes both the images and report in a `finally` cleanup.

Run Metro for the development client on port 8082, then execute:

```powershell
npm run evaluate:ocr-images:android
```

The report separates native recognition from downstream parser behavior:

- OCR completion, exact token-sequence matches, and aggregate token accuracy
  measure ML Kit output.
- Deadline and essential-field metrics run the recognized text through Duely's
  deterministic parser.
- Per-fixture output contains IDs, timing, and numeric accuracy only. It never
  writes the full recognized OCR text.

This small synthetic pack validates the evaluation plumbing and provides an
early controlled signal. It does not satisfy the deferred real/redacted beta
dataset requirement or certify production OCR accuracy.
