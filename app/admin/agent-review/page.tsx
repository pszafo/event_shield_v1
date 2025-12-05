// app/admin/agent-review/page.tsx

import { evaluateCancellation } from "../../../lib/cancellationEvaluator";
import { inferWeatherFromOpenMeteo } from "../../../lib/openMeteo";

function asString(v: any) {
  return Array.isArray(v) ? v[0] : v || "";
}

type ClaimQuery = {
  reason?: string
  eventDate?: string
  lat?: string
  lon?: string
  yesRatio?: string
  hoursBefore?: string
  orgRate?: string
};

export default async function ClaimReviewPage({
  searchParams = {} as ClaimQuery,
}) 
{
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

      <form method="GET" style={{ 
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  maxWidth: "800px"
}}>
  
  <h3 style={{ marginBottom: "-8px" }}>Event Details</h3>

  {/* Event Date + Lat/Lon */}
  <div style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  }}>
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

  {/* Yes Ratio + Hours Before + Org Rate */}
  <div style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  }}>
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

  {/* Submit */}
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
      width: "fit-content"
    }}
  >
    Evaluate Cancellation
  </button>
</form>
