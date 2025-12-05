// app/admin/agent-review/page.tsx

export const dynamic = "force-dynamic";

import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import type { WeatherSeverity } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";
import OpenAI from "openai";

function asString(v: any): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export default async function AgentReviewPage({ searchParams = {} }) {
  const reason = asString(searchParams.reason);
  const manualWeather = (asString(searchParams.weather) || "none") as WeatherSeverity;
  const yesRatioStr = asString(searchParams.yesRatio);
  const hoursBeforeStr = asString(searchParams.hoursBefore);
  const orgRateStr = asString(searchParams.orgRate);

  const eventDate = asString(searchParams.eventDate);  // <-- NEW
  const latStr = asString(searchParams.lat);           // <-- NEW
  const lonStr = asString(searchParams.lon);           // <-- NEW

  const hasInput = reason || yesRatioStr || hoursBeforeStr || orgRateStr || eventDate || latStr || lonStr;

  let weatherUsedForEval: WeatherSeverity = manualWeather;
  let weatherEvidence: string | null = null;
  let result = null;
  let aiSummary: string | null = null;

  if (hasInput) {
    const yesRatio = Math.min(1, Math.max(0, parseFloat(yesRatioStr) / 100 || 0));
    const hoursBefore = Number(hoursBeforeStr || 0);
    const orgRate = Math.min(1, Math.max(0, parseFloat(orgRateStr) / 100 || 0));

    // 🔥 USE OPEN-METEO IF DATE + LAT + LON EXIST
    if (eventDate && latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      if (!isNaN(lat) && !isNaN(lon)) {
        try {
          const inferred = await inferWeatherFromOpenMeteo(lat, lon, eventDate);
          if (inferred) {
            weatherUsedForEval = inferred.severity;
            weatherEvidence = inferred.explanation;
          } else {
            weatherEvidence = "Could not fetch weather data from Open-Meteo.";
          }
        } catch (e) {
          weatherEvidence = "Open-Meteo request failed — using manual weather severity.";
        }
      }
    }

    // 🧮 Rule engine evaluation
    result = evaluateCancellation({
      reason,
      weatherSeverity: weatherUsedForEval,
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });

    // 🤖 AI summary (optional)
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await client.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "Insurance analyst assistant." },
            {
              role: "user",
              content: `
Reason: ${reason}
Weather used: ${weatherUsedForEval}
Weather evidence: ${weatherEvidence}
Score: ${result.reliabilityScore}
Decision: ${result.decision}
Explain in 3 sentences.`,
            },
          ],
        });
        aiSummary = completion.choices[0]?.message?.content || null;
      } catch (err) {
        aiSummary = "AI failed (invalid key or quota).";
      }
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Event Cancellation – Agent Review</h1>

      {/* FORM */}
      <form method="GET" action="/admin/agent-review" style={{ marginTop: "20px" }}>
        
  {/* Reason */}
  <label>Organizer's stated reason</label>
  <textarea 
    name="reason" 
    defaultValue={reason} 
    style={{ width: "100%", height: "70px", marginBottom: "20px" }} 
  />

  {/* Manual weather */}
  <label>Manual weather severity (fallback)</label>
  <select 
    name="weather" 
    defaultValue={manualWeather} 
    style={{ width: "100%", marginBottom: "20px" }}
  >
    <option value="none">None / clear</option>
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
    <label>Organizer past cancellation rate (%)</label>
    <input name="orgRate" type="number" defaultValue={orgRateStr} style={{ width: "100%" }} />
  </div>

  <hr style={{ margin: "30px 0" }} />

  {/* 🔥 NEW FIELDS BELOW */}
  <h3>Automatic Weather Verification (Open-Meteo)</h3>

  <label>Event Date (YYYY-MM-DD)</label>
  <input 
    name="eventDate"
    type="text"
    placeholder="2025-02-20"
    defaultValue={eventDate}
    style={{ width: "100%", marginBottom: "20px" }}
  />

  <label>Latitude</label>
  <input 
    name="lat"
    type="text"
    placeholder="12.9716"
    defaultValue={latStr}
    style={{ width: "100%", marginBottom: "20px" }}
  />

  <label>Longitude</label>
  <input 
    name="lon"
    type="text"
    placeholder="77.5946"
    defaultValue={lonStr}
    style={{ width: "100%", marginBottom: "20px" }}
  />

  <button 
    type="submit"
    style={{ marginTop: "20px", padding: "12px 18px", background: "black", color: "white" }}
  >
    Evaluate cancellation
  </button>
</form>
