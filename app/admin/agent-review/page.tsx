// app/admin/agent-review/page.tsx
import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import type { WeatherSeverity } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";
import OpenAI from "openai";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function AgentReviewPage({ searchParams = {} }: PageProps) {
  const reason = asString(searchParams.reason);
  const manualWeather = (asString(searchParams.weather) || "none") as WeatherSeverity;
  const yesRatioStr = asString(searchParams.yesRatio);
  const hoursBeforeStr = asString(searchParams.hoursBefore);
  const orgRateStr = asString(searchParams.orgRate);

  const eventDateStr = asString(searchParams.eventDate); // YYYY-MM-DD
  const latStr = asString(searchParams.lat);
  const lonStr = asString(searchParams.lon);

  const hasInput =
    reason ||
    yesRatioStr !== "" ||
    hoursBeforeStr !== "" ||
    orgRateStr !== "" ||
    eventDateStr !== "" ||
    latStr !== "" ||
    lonStr !== "";

  let result: ReturnType<typeof evaluateCancellation> | null = null;
  let aiSummary: string | null = null;
  let weatherEvidence: string | null = null;
  let weatherUsedForEval: WeatherSeverity = manualWeather;

  if (hasInput) {
    const yesRatio = clamp01(parseFloat(yesRatioStr || "0"));
    const hoursBefore = Math.max(0, parseFloat(hoursBeforeStr || "0"));
    const orgRate = clamp01(parseFloat(orgRateStr || "0"));

    // 1) Try to infer weather from Open-Meteo if all fields provided
    if (eventDateStr && latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        try {
          const inferred = await inferWeatherFromOpenMeteo(lat, lon, eventDateStr);
          if (inferred) {
            weatherUsedForEval = inferred.severity;
            weatherEvidence = inferred.explanation;
          } else {
            weatherEvidence =
              "Could not fetch weather data from Open-Meteo – falling back to manually selected weather severity.";
          }
        } catch (e) {
          console.error("Open-Meteo integration error", e);
          weatherEvidence =
            "Open-Meteo request failed – falling back to manually selected weather severity.";
        }
      } else {
        weatherEvidence =
          "Latitude/longitude values were invalid – cannot auto-check weather.";
      }
    }

    // 2) Run rule-based evaluation
    result = evaluateCancellation({
      reason: reason || "",
      weatherSeverity: weatherUsedForEval,
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });

    // 3) Optional AI layer – ONLY runs if OPENAI_API_KEY is set
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        });

        const prompt = buildAiPrompt(
          reason,
          weatherUsedForEval,
          yesRatio,
          hoursBefore,
          orgRate,
          result,
          weatherEvidence
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
        reliability score and, if configured, use Open-Meteo and an AI assistant
        to judge whether the cancellation looks genuine or suspicious.
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
            Manual weather severity (fallback)
            <br />
            <select
              name="weather"
              defaultValue={manualWeather}
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            >
              <option value="none">None / clear</option>
              <option value="light">Light rain</option>
              <option value="heavy">Heavy rain</option>
              <option value="storm">Storm / thunderstorm</option>
            </select>
          </label>
          <p style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            If you also provide location + date below, Open-Meteo will override
            this based on real rain data.
          </p>
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

        <hr style={{ margin: "18px 0" }} />

        <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>
          Automatic weather verification (Open-Meteo)
        </h3>
        <p style={{ fontSize: "12px", color: "#777", marginBottom: "8px" }}>
          Optional: provide event date and coordinates to auto-check actual rain
          for that place and day. This will override the weather severity above.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <label style={{ flex: 1 }}>
            Event date (YYYY-MM-DD)
            <br />
            <input
              type="text"
              name="eventDate"
              defaultValue={eventDateStr || ""}
              placeholder="e.g. 2025-02-20"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>

          <label style={{ flex: 1 }}>
            Latitude
            <br />
            <input
              type="text"
              name="lat"
              defaultValue={latStr || ""}
              placeholder="e.g. 12.9716"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>

          <label style={{ flex: 1 }}>
            Longitude
            <br />
            <input
              type="text"
              name="lon"
              defaultValue={lonStr || ""}
              placeholder="e.g. 77.5946"
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

          {weatherEvidence && (
            <>
              <h3 style={{ marginTop: "12px", marginBottom: "4px" }}>
                Weather evidence (Open-Meteo)
              </h3>
              <p style={{ fontSize: "13px", color: "#555" }}>{weatherEvidence}</p>
            </>
          )}

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
  result: ReturnType<typeof evaluateCancellation>,
  weatherEvidence: string | null
): string {
  const yesPercent = Math.round(yesRatio * 100);
  const orgPercent = Math.round(orgRate * 100);

  return `
We are evaluating whether an event cancellation is genuine or fraudulent for micro-insurance.

Inputs:
- Organizer reason: "${reason || "not provided"}"
- Weather severity used for evaluation: ${weather}
- Weather evidence from Open-Meteo: ${weatherEvidence || "not available"}
- Participant confirmations: ${yesPercent}% confirmed the event was cancelled
- Hours before event when cancellation was made: ${hoursBefore}
- Organizer past cancellation rate: ${orgPercent}%
- Rule-based reliability score: ${result.reliabilityScore}/100
- Rule-based decision: ${result.decision}

Give a concise 3–4 sentence assessment:
1) Is this more likely genuine, unclear, or suspicious?
2) Which 2–3 factors (including real weather data if present) mattered most?
3) What would you recommend to an insurance analyst (approve, decline, or escalate)?
`;
}
