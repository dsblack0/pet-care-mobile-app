import { cases } from "./cases.ts";
import { buildPrompt } from "../src/prompt.ts";
import { validateContext, validateBatch } from "../src/validation.ts";
import { sampleChallenges } from "../src/fixtures.ts";
let failures = 0;
for (const test of cases) {
  try {
    const c = validateContext(test.context);
    const eligible = c.preferences.some((p) => p.enabled && p.memberIds.length);
    if (!eligible) {
      console.log("EXPECTED PREFLIGHT REJECT", test.id);
      continue;
    }
    const p = buildPrompt(c, 0, []);
    if (!p.includes("USER CONTEXT JSON") || !p.includes("history"))
      throw Error("Prompt missing context");
    console.log("PASS", test.id, test.description);
  } catch (e) {
    failures++;
    console.error("FAIL", test.id, e);
  }
}
try {
  validateBatch({ challenges: sampleChallenges }, cases[0].context);
  console.log("PASS fixture batch");
} catch (e) {
  failures++;
  console.error("FAIL fixture batch", e);
}
if (failures) process.exitCode = 1;
