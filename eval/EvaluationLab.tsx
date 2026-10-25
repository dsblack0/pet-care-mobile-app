import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { generateScenarios, type Sampling } from "./scenarios";
import { evaluateOne, summarize, resultsCSV, type EvalRun } from "./runner";
import { loadEvalRun, saveEvalRun, clearEvalRun } from "./storage";
const Button = ({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={[styles.button, disabled && { opacity: 0.4 }]}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);
export default function EvaluationLab() {
  const [seed, setSeed] = useState("42"),
    [count, setCount] = useState("10"),
    [repetitions, setRepetitions] = useState("1"),
    [sampling, setSampling] = useState<Sampling>("balanced");
  const [run, setRun] = useState<EvalRun | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const stop = useRef(false);
  useEffect(() => {
    loadEvalRun()
      .then((x) => {
        if (x) setRun(x);
      })
      .catch((e) => setMessage(String(e)));
  }, []);
  const scenarios = () =>
    generateScenarios({ seed: Number(seed), count: Number(count), sampling });
  async function execute(resume: boolean) {
    if (busy) return;
    let list;
    try {
      list = scenarios();
      if (
        !Number.isInteger(Number(repetitions)) ||
        Number(repetitions) < 1 ||
        Number(repetitions) > 10
      )
        throw Error("Repetitions must be 1-10");
    } catch (e) {
      setMessage(String(e));
      return;
    }
    const total = list.length * Number(repetitions);
    if (
      resume &&
      (!run ||
        run.seed !== Number(seed) ||
        run.total !== total ||
        run.sampling !== sampling ||
        run.repetitions !== Number(repetitions) ||
        run.scenarioCount !== Number(count))
    ) {
      setMessage(
        "Settings differ from saved run. Restore matching settings or start a new run.",
      );
      return;
    }
    const next: EvalRun =
      resume && run
        ? { ...run, results: [...run.results], complete: false }
        : {
            runId: `run-${Date.now()}`,
            seed: Number(seed),
            sampling,
            repetitions: Number(repetitions),
            scenarioCount: Number(count),
            createdAt: new Date().toISOString(),
            results: [],
            total,
            complete: false,
          };
    stop.current = false;
    setBusy(true);
    setMessage("Running on device. Keep app foregrounded.");
    try {
      for (let index = next.results.length; index < total; index++) {
        if (stop.current) break;
        const scenario = list[Math.floor(index / Number(repetitions))];
        const repetition = (index % Number(repetitions)) + 1;
        const result = await evaluateOne(scenario, repetition);
        next.results.push(result);
        const snapshot = { ...next, results: [...next.results] };
        setRun(snapshot);
        await saveEvalRun(snapshot);
      }
      next.complete = next.results.length === total;
      setRun({ ...next, results: [...next.results] });
      await saveEvalRun(next);
      setMessage(
        next.complete
          ? "Evaluation completed."
          : "Evaluation stopped. Results saved; you can resume.",
      );
    } catch (e) {
      setMessage(`Runner error: ${String(e)}. Completed results remain saved.`);
    } finally {
      setBusy(false);
    }
  }
  async function exportResults(format: "json" | "csv") {
    if (!run) return;
    try {
      await Share.share({
        message:
          format === "json"
            ? JSON.stringify(
                { ...run, summary: summarize(run.results) },
                null,
                2,
              )
            : resultsCSV(run.results),
        title: `pet-evaluation-${format}`,
      });
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function clear() {
    if (busy) return;
    await clearEvalRun();
    setRun(null);
    setMessage("Saved evaluation cleared.");
  }
  const summary = run ? summarize(run.results) : null;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Automated Apple LLM Evaluation Lab</Text>
      <Text>
        Seeded, repeatable synthetic families and challenge histories. No real
        user data required.
      </Text>
      <Text>Random seed</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={seed}
        onChangeText={setSeed}
        editable={!busy}
      />
      <Text>Scenario count (1–500)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={count}
        onChangeText={setCount}
        editable={!busy}
      />
      <Text>Repetitions per scenario (1–10)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={repetitions}
        onChangeText={setRepetitions}
        editable={!busy}
      />
      <Text>Sampling mode</Text>
      <View style={styles.row}>
        {(["balanced", "random", "edge"] as const).map((x) => (
          <Button
            key={x}
            label={`${sampling === x ? "✓ " : ""}${x}`}
            disabled={busy}
            onPress={() => setSampling(x)}
          />
        ))}
      </View>
      <Text>
        Planned weekly batches: {Number(count || 0) * Number(repetitions || 0)}.
        Each batch can require multiple model calls and retries.
      </Text>
      <View style={styles.row}>
        <Button
          label="Start new run"
          disabled={busy}
          onPress={() => execute(false)}
        />
        <Button
          label="Resume saved"
          disabled={busy || !run || run.complete}
          onPress={() => execute(true)}
        />
        <Button
          label="Stop after current batch"
          disabled={!busy}
          onPress={() => {
            stop.current = true;
            setMessage("Stopping after current weekly batch...");
          }}
        />
      </View>
      {!!run && (
        <View style={styles.panel}>
          <Text style={styles.title}>
            Results {run.results.length}/{run.total}{" "}
            {run.complete ? "(complete)" : "(partial)"}
          </Text>
          <Text>
            Passed: {summary?.passed} | Failed: {summary?.failed} | Model
            errors: {summary?.errors}
          </Text>
          <Text>
            Median completed batch time: {summary?.medianLatencyMs ?? "n/a"} ms
          </Text>
          <Text>
            Raw prompts, responses, contexts, retries and timings are included
            in JSON export.
          </Text>
          <View style={styles.row}>
            <Button label="Share JSON" onPress={() => exportResults("json")} />
            <Button label="Share CSV" onPress={() => exportResults("csv")} />
            <Button
              label="Clear saved run"
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Delete evaluation?",
                  "This clears saved evaluation results.",
                  [
                    { text: "Cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        clear().catch((e) => setMessage(String(e))),
                    },
                  ],
                )
              }
            />
          </View>
          {run.results
            .slice(-8)
            .reverse()
            .map((x, i) => (
              <View
                key={`${x.scenarioId}-${x.repetition}-${i}`}
                style={styles.result}
              >
                <Text>
                  {x.passed ? "PASS" : "FAIL"} {x.scenarioId} ({x.kind}) ·
                  repeat {x.repetition} · {x.durationMs}ms
                </Text>
                {!!x.error && <Text selectable>{x.error}</Text>}
                {x.failures.map((f, j) => (
                  <Text key={j}>{f}</Text>
                ))}
              </View>
            ))}
        </View>
      )}
      {!!message && (
        <Text selectable style={styles.message}>
          {message}
        </Text>
      )}
      <Text style={styles.note}>
        Passing automated checks does not prove history personalization or
        clinical safety. Review exported results manually. This runner uses the
        real Apple model, not fixture responses.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: 10 },
  title: { fontSize: 18, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    padding: 8,
    borderRadius: 6,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  button: { backgroundColor: "#164e63", padding: 9, borderRadius: 7 },
  buttonText: { color: "#fff", fontSize: 12 },
  panel: { backgroundColor: "#e2e8f0", padding: 12, gap: 8, borderRadius: 9 },
  result: { backgroundColor: "#fff", padding: 8, borderRadius: 6 },
  message: { backgroundColor: "#fef3c7", padding: 10 },
  note: { fontSize: 12, color: "#475569" },
});
