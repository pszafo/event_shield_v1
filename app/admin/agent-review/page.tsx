// app/admin/agent-review/page.tsx

import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";

function asString(v: any) {
  return Array.isArray(v) ? v[0] : v || "";
}

export default async function AgentReviewPage({ searchParams }: any) {
  const eventDate = asString(searchParams.eventDate);
  const lat = asString(searchParams.lat);
  const lon = asString(searchParams.lon);
  const reason = asString(searchParams.reason);
  const yesRatio = Number(asString(searchParams.yesRatio)) / 100;
  const hoursBefore = Number(asString(searchParams.hoursBefore));
  const orgRate = Number(asString(searchParams.orgRate)) / 100;

  let weatherInfo = null;
  if (eventDate && lat && lon) {
    weatherInfo = await inferWeatherFromOpenMeteo(
      Number(lat),
      Number(lon),
      eventDate
    );
  }

  let evaluation = null;
  if (reason && eventDate && lat && lon) {
    evaluation = evaluateCancellation({
      reason,
      weatherSeverity: weatherInfo?.severity || "none",
      participantYesRatio: yesRatio,
      hoursBeforeEvent: hoursBefore,
      organizerCancellationRate: orgRate,
    });
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Event Cancellation – Agent Review</h1>

      <form method="GET">
        <h3>Event Details</h3>

        <label>Event Date (YYYY-MM-DD)</label>
        <input name="eventDate" placeholder="2025-02-20" />

        <label>Latitude</label>
        <input name="lat" placeholder="12.9716" />

        <label>Longitude</label>
        <input name="lon" placeholder="77.5946" />

        <label>Organizer Reason</label>
        <textarea
          name="reason"
          placeholder="Why did the organizer cancel?"
        />

        <label>Participant confirmations (%)</label>
        <input name="yesRatio" placeholder="5" />

        <label>Hours before event cancellation happened</label>
        <input name="hoursBefore" placeholder="2" />

        <label>Organizer cancellation rate (%)</label>
        <input name="orgRate" placeholder="50" />

        <button type="submit">Evaluate Cancellation</button>
      </form>

      {weatherInfo && (
        <div style={{ marginTop: "20px" }}>
          <h3>Weather Analysis</h3>
          <p>
            <b>Severity: </b> {weatherInfo.severity}
          </p>
          <p>{weatherInfo.explanation}</p>
        </div>
      )}

      {evaluation && (
        <div style={{ marginTop: "20px" }}>
          <h3>Risk Assessment</h3>
          <p>
            <b>Reliability Score: </b>
            {evaluation.reliabilityScore}
          </p>
          <p>
            <b>Decision: </b> {evaluation.decision}
          </p>

          <h4>Factors Considered:</h4>
          <ul>
            {evaluation.factorNotes.map((note: string, i: number) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
