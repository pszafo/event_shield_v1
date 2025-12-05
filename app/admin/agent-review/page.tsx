// app/admin/agent-review/page.tsx

import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";
import OpenAI from "openai";

function asString(v: any): string {
  return Array.isArray(v) ? v[0] : v || "";
}

type ClaimQuery = {
  reason?: string;
  eventDate?: string;
  lat?: string;
  lon?: string;
  yesRatio?: string;
  hoursBefore?: string;
  orgRate?: string;
};

type AgentReviewProps = { searchParams?: ClaimQuery };

export default async function AgentReviewPage({ searchParams }: AgentReviewProps) {
  const params = searchParams || {};

  const reason = asString(params.reason);
  const eventDate = asString(params.eventDate);
  const lat = asString(params.lat);
  const lon = asString(params.lon);
  const yesRatio = Number(asString(params.yesRatio ?? "0")) / 100;
  const hoursBefore = Number(asString(params.hoursBefore ?? "0"));
  const orgRate = Number(asString(params.orgRate ?? "0")) / 100;

  // WEATHER LOOKUP
  let weatherInfo: { severity: string; explanation: string } | null = null;

  if (eventDate && lat && lon) {
    weatherInfo = await inferWeatherFromOpenMeteo(
      Number(lat),
      Number(lon),
      eventDate
    );
  }

  // RULE-BASED EVALUATION (our own scoring)
  let evaluation: any = null;

  if (reason && eventDate && lat && lon) {
    evaluation = evaluateCancellation({
      reason,
      weatherSeverity: (weatherInfo?.severity as any) || "none",
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });
  }

  // AI EVALUATION (OpenAI)
  let aiVerdict: string | null = null;

  if (evaluation && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an insurance assessment agent. Evaluate whether the event cancellation appears genuine or suspicious.

Event Details:
- Reason: ${reason}
- Weather Severity: ${weatherInfo?.severity}
- Weather Explanation: ${weatherInfo?.explanation}
- Participant Confirmations: ${yesRatio * 100}%
- Hours Before Event Cancelled: ${hoursBefore}
- Organizer Past Cancellation Rate: ${orgRate * 100}%
- Rule Model Score: ${evaluation.reliabilityScore}
- Rule Model Decision: ${evaluation.decision}

Respond with a clear, short verdict in 3–5 sentences.
    `;

    try {
      const result = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });

      aiVerdict = result.output_text || "AI could not generate a verdict.";
    } catch (err: any) {
      aiVerdict = "AI evaluation failed: " + err.message;
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "20px" }}>
        Event Cancellation – Agent Review
      </h1>

      {/* FORM */}
      <form
        method="GET"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "800px",
        }}
      >
        <h3 style={{ marginBottom: "-8px" }}>Event Details</h3>

        {/* Event Date + Lat/Lon */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Event Date (YYYY-MM-DD)</label>
            <input name="eventDate" placeholder="2025-02-20" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Latitude</label>
            <input name="lat" placeholder="12.9716" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Longitude</label>
            <input name="lon" placeholder="77.5946" />
          </div>
        </div>

        {/* Reason */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label>Organizer Reason</label>
          <textarea
            name="reason"
            placeholder="Why did the organizer cancel?"
            style={{ minHeight: "80px" }}
          />
        </div>

        {/* Percentages + hours */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Participant confirmations (%)</label>
            <input name="yesRatio" placeholder="5" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Hours before event cancellation happened</label>
            <input name="hoursBefore" placeholder="2" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label>Organizer cancellation rate (%)</label>
            <input name="orgRate" placeholder="50" />
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          style={{
            marginTop: "16px",
            background: "black",
            color: "white",
            padding: "12px 20px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            width: "fit-content",
          }}
        >
          Evaluate Cancellation
        </button>
      </form>

      {/* WEATHER RESULTS */}
      {weatherInfo && (
        <div style={{ marginTop: "40px" }}>
          <h3>Weather Analysis</h3>
          <p>
            <b>Severity:</b> {weatherInfo.severity}
          </p>
          <p>{weatherInfo.explanation}</p>
        </div>
      )}

      {/* RULE MODEL RESULTS */}
      {evaluation && (
        <div style={{ marginTop: "40px" }}>
          <h3>Rule-Based Assessment</h3>
          <p>
            <b>Score:</b> {evaluation.reliabilityScore}
          </p>
          <p>
            <b>Decision:</b> {evaluation.decision}
          </p>

          <h4>Factors:</h4>
          <ul>
            {evaluation.factorNotes.map((note: string, i: number) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI VERDICT */}
      {aiVerdict && (
        <div style={{ marginTop: "40px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
          <h3>AI Final Verdict</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{aiVerdict}</p>
        </div>
      )}
    </div>
  );
}
