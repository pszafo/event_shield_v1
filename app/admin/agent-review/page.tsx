// app/admin/agent-review/page.tsx
import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import type { WeatherSeverity } from "../../../lib/cancellationEvaluator";
import OpenAI from "openai";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function AgentReviewPage({ searchParams = {} }: PageProps) {
  const reason = asString(searchParams.reason);
  const weather = (asString(searchParams.weather) || "none") as WeatherSeverity;
  const yesRatioStr = asString(searchParams.yesRatio);
  const hoursBeforeStr = asString(searchParams.hoursBefore);
  const orgRateStr = asString(searchParams.orgRate);

  const hasInput =
    reason ||
    yesRatioStr !== "" ||
    hoursBeforeStr !== "" ||
    orgRateStr !== "";

  let result: ReturnType<typeof evaluateCancellation> | null = null;
  let aiSummary: string | null = null;

  if (hasInput) {
    const yesRatio = clamp01(parseFloat(yesRatioStr || "0"));
    const hoursBefore = Math.max(0, parseFloat(hoursBeforeStr || "0"));
    const orgRate = clamp01(parseFloat(orgRateStr || "0"));

    result = evaluateCancellation({
      reason: reason || "",
      weatherSeverity: weather,
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });

    // Optional AI layer – ONLY runs if OPENAI_API_KEY is set
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        });

        const prompt = buildAiPrompt(
          reason,
          weather,
          yesRatio,
          hoursBefore,
          orgRate,
          result
        );

        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant helping evaluate event cancellation fraud risk for micro-insurance. Answer concisely in 3–4 sentences.",
            },
            { role: "user", content: prompt },
          ],
        });

        aiSummary =
          completion.choices[0]?.message?.content ??
          "AI summary not available.";
      } catch (err) {
        aiSummary = "AI analysis failed (check API key / quota).";
      }
    }
  }

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>
        Event Cancellation – Agent Review
      </h1>
      <p style={{ fontSize: "14px", color: "#555", marginBottom: "16px" }}>
        Enter details for a cancelled event. The tool will calculate a
        reliability score and, if configured, ask an AI assistant for a short
        verdict on whether the cancellation looks genuine or suspicious.
      </p>

      {/* FORM */}
      <form
        method="GET"
        action="/admin/agent-review"
        style={{ fontSize: "14px", marginBottom: "24px" }}
      >
        <div style={{ marginBottom: "12px" }}>
          <label>
            Organizer&apos;s stated reason
            <br />
            <textarea
              name="reason"
              defaultValue={reason}
              placeholder="Example: Heavy rain and waterlogging at Cubbon Park, police asked us to clear the track..."
              style={{
                width: "100%",
                minHeight: "70px",
                padding: "8px",
                marginTop: "4px",
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Weather severity
            <br />
            <select
              name="weather"
              defaultValue={weather}
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            >
              <option value="none">None / clear</option>
              <option value="light">Light rain</option>
              <option value="heavy">Heavy rain</option>
              <option value="storm">Storm / thunderstorm</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <label style={{ flex: 1 }}>
            Participant confirmations (% who said event was cancelled)
            <br />
            <input
              type="number"
              name="yesRatio"
              min={0}
              max={100}
              step={5}
              defaultValue={yesRatioStr || ""}
              placeholder="e.g. 70"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>

          <label style={{ flex: 1 }}>
            Hours before event when cancellation was triggered
            <br />
            <input
              type="number"
              name="hoursBefore"
              min={0}
              step={0.5}
              defaultValue={hoursBeforeStr || ""}
              placeholder="e.g. 1.5"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Organizer past cancellation rate (% of their past events cancelled)
            <br />
            <input
              type="number"
              name="orgRate"
              min={0}
              max={100}
              step={5}
              defaultValue={orgRateStr || ""}
              placeholder="e.g. 10"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>
        </div>

        <button
          type="submit"
          style={{
            marginTop: "8px",
            padding: "10px 18px",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Evaluate cancellation
        </button>
      </form>

      {/* RESULTS */}
      {hasInput && result && (
        <div style={{ fontSize: "14px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
            Risk Assessment
          </h2>
          <p>
            <strong>Reliability score:</strong> {result.reliabilityScore}/100
          </p>
          <p>
            <strong>System decision:</strong>{" "}
            {result.decision === "LIKELY_GENUINE"
              ? "Likely genuine"
              : result.decision === "POTENTIALLY_FRAUD"
              ? "Potentially fraudulent"
              : "Uncertain – needs manual review"}
          </p>

          <h3 style={{ marginTop: "12px", marginBottom: "4px" }}>
            Factor breakdown
          </h3>
          <ul>
            {result.factorNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>

          <h3 style={{ marginTop: "12px", marginBottom: "4px" }}>AI opinion</h3>
          <p style={{ fontSize: "13px", color: "#555" }}>
            {aiSummary
              ? aiSummary
              : "No AI key configured – showing only rule-based result."}
          </p>
        </div>
      )}
    </div>
  );
}

// Helpers

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function buildAiPrompt(
  reason: string,
  weather: WeatherSeverity,
  yesRatio: number,
  hoursBefore: number,
  orgRate: number,
  result: ReturnType<typeof evaluateCancellation>
): string {
  const yesPercent = Math.round(yesRatio * 100);
  const orgPercent = Math.round(orgRate * 100);

  return `
We are evaluating whether an event cancellation is genuine or fraudulent for micro-insurance.

Inputs:
- Organizer reason: "${reason || "not provided"}"
- Weather severity: ${weather}
- Participant confirmations: ${yesPercent}% confirmed the event was cancelled
- Hours before event when cancellation was made: ${hoursBefore}
- Organizer past cancellation rate: ${orgPercent}%
- Rule-based reliability score: ${result.reliabilityScore}/100
- Rule-based decision: ${result.decision}

Give a concise 3–4 sentence assessment:
1) Is this more likely genuine, unclear, or suspicious?
2) Which 2–3 factors mattered most?
3) What would you recommend to an insurance analyst (approve, decline, or escalate)?
`;
}
