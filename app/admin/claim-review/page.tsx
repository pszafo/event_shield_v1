export const dynamic = "force-dynamic";

import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import type { WeatherSeverity } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";
import OpenAI from "openai";

function asString(v: any): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export default async function ClaimReviewPage({ searchParams = {} }) {
  const reason = asString(searchParams.reason);
  const manualWeather = (asString(searchParams.weather) || "none") as WeatherSeverity;
  const yesRatioStr = asString(searchParams.yesRatio);
  const hoursBeforeStr = asString(searchParams.hoursBefore);
  const orgRateStr = asString(searchParams.orgRate);

  const eventDate = asString(searchParams.eventDate);
  const latStr = asString(searchParams.lat);
  const lonStr = asString(searchParams.lon);

  const hasInput =
    reason || yesRatioStr || hoursBeforeStr || orgRateStr || eventDate || latStr || lonStr;

  let weatherUsed: WeatherSeverity = manualWeather;
  let weatherEvidence: string | null = null;
  let result = null;
  let aiSummary: string | null = null;

  if (hasInput) {
    const yesRatio = Math.min(1, Math.max(0, parseFloat(yesRatioStr) / 100 || 0));
    const hoursBefore = parseFloat(hoursBeforeStr || "0");
    const orgRate = Math.min(1, Math.max(0, parseFloat(orgRateStr) / 100 || 0));

    // ---- WEATHER AUTO CHECK ----
    if (eventDate && latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lon)) {
        try {
          const inferred = await inferWeatherFromOpenMeteo(lat, lon, eventDate);
          if (inferred) {
            weatherUsed = inferred.severity;
            weatherEvidence = inferred.explanation;
          } else {
            weatherEvidence = "Weather data unavailable.";
          }
        } catch (err) {
          weatherEvidence = "Open-Meteo API error; using manual weather severity.";
        }
      }
    }

    // ---- RULE ENGINE ----
    result = evaluateCancellation({
      reason,
      weatherSeverity: weatherUsed,
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });

    // ---- AI LAYER ----
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "Insurance claims analyst assistant." },
            {
              role: "user",
              content: `
Claim reason: ${reason}
Weather severity used: ${weatherUsed}
Weather evidence: ${weatherEvidence}
Score: ${result.reliabilityScore}
Decision: ${result.decision}
Explain in 3 sentences.`,
            },
          ],
        });
        aiSummary = completion.choices[0]?.message?.content || null;
      } catch {
        aiSummary = "AI failed or key missing.";
      }
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Claim Review – Cancellation Analysis</h1>

      <form method="GET" action="/admin/claim-review" style={{ marginTop: "20px" }}>

        <label>Reason for cancellation</label>
        <textarea
          name="reason"
          defaultValue={reason}
          style={{ width: "100%", height: "70px", marginBottom: "20px" }}
        />

        <label>Manual weather severity (fallback)</label>
        <select name="weather" defaultValue={manualWeather} style={{ width: "100%", marginBottom: "20px" }}>
          <option value="none">None</option>
          <option value="light">Light rain</option>
          <option value="heavy">Heavy rain</option>
          <option value="storm">Storm</option>
        </select>

        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <label>Participant confirmations (%)</label>
            <input name="yesRatio" type="number" defaultValue={yesRatioStr} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Hours before event cancellation</label>
            <input name="hoursBefore" type="number" defaultValue={hoursBeforeStr} style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <label>Organizer cancellation rate (%)</label>
          <input name="orgRate" type="number" defaultValue={orgRateStr} style={{ width: "100%" }} />
        </div>

        <hr style={{ margin: "30px 0" }} />

        <h3>Automatic Weather Verification</h3>

        <label>Event Date (YYYY-MM-DD)</label>
        <input name="eventDate" type="text" placeholder="2025-02-20" defaultValue={eventDate} style={{ width: "100%", marginBottom: "20px" }} />

        <label>Latitude</label>
        <input name="lat" type="text" placeholder="12.9716" defaultValue={latStr} style={{ width: "100%", marginBottom: "20px" }} />

        <label>Longitude</label>
        <input name="lon" type="text" placeholder="77.5946" defaultValue={lonStr} style={{ width: "100%", marginBottom: "20px" }} />

        <button type="submit" style={{ padding: "12px 18px", background: "black", color: "white", marginTop: "20px" }}>
          Review Claim
        </button>
      </form>

      {result && (
        <div style={{ marginTop: "40px" }}>
          <h2>Risk Assessment</h2>
          <p><strong>Score:</strong> {result.reliabilityScore}</p>
          <p><strong>Decision:</strong> {result.decision}</p>

          {weatherEvidence && (
            <>
              <h3>Weather Evidence</h3>
              <p>{weatherEvidence}</p>
            </>
          )}

          <h3>AI Summary</h3>
          <p>{aiSummary || "AI not available"}</p>
        </div>
      )}
    </div>
  );
}
