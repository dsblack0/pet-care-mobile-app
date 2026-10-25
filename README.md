# Automated Apple LLM Evaluation Lab — testing-only app

This build contains **only the automated evaluation interface**. There is no pet-owner preferences screen, challenge list, activity logging screen, or manual family setup. Synthetic scenarios are generated automatically with a reproducible seed and are passed to Apple's on-device model through `react-native-apple-llm`.

The only supported challenge categories are **feeding, walking, training, play, grooming, medication**.

## User flow

1. Enter random seed, scenario count, and repetitions.
2. Choose balanced, random, or edge-case sampling.
3. Tap **Start new run**. Keep the app foregrounded on a supported Apple Intelligence iPhone.
4. Inspect progress, passes/failures, latency, and the latest results.
5. Tap **Stop after current batch** to interrupt safely; use **Resume saved** to continue with matching settings.
6. Share JSON (full inputs, prompts, raw outputs, errors) or CSV (summary) via iOS share sheet.

The app performs real Apple model calls; it does not offer a fixture/preview generation mode. Test outcomes are not known until the native build is run.

## Setup

```sh
npm install
npx expo install --fix
npx expo-doctor
npm run typecheck
npm test
npm run eval:fixtures
npx expo prebuild --clean --platform ios
npx expo run:ios --device
```

Expo SDK 58 and native compatibility of `react-native-apple-llm` have **not** been verified in this environment. An Apple Intelligence-capable iPhone, compatible Xcode/iOS, and a development build are needed; Expo Go is insufficient.

## Main files

- `App.tsx`: evaluation-only root interface.
- `eval/EvaluationLab.tsx`: configuration, run/stop/resume, results and export UI.
- `eval/scenarios.ts`: deterministic synthetic families, preferences, histories and edge cases.
- `eval/runner.ts`: sequential calls, raw traces, and scoring.
- `eval/scoring.ts`: deterministic automated checks.
- `eval/storage.ts`: saved evaluation state.
- `src/prompt.ts`: exact prompt and session instructions.
- `src/apple.ts`: Apple Foundation Models adapter and retries.
- `src/schema.ts`, `src/validation.ts`: input/output contracts and validation.

Other `src` modules are retained only as underlying test utilities; they are not exposed as user-facing screens.

## Scope and limitations

- Random seeds reproduce **inputs**, not necessarily nondeterministic LLM outputs.
- Passing structural checks does not establish good history adaptation, usefulness, or clinical safety.
- Medication instructions require special caution; do not interpret a pass as medical validation.
- Results are shared as JSON/CSV text through the native share sheet, not written as guaranteed file attachments.
- The app does not collect real pet/family data or require manual history entry.

