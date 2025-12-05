// lib/openMeteo.ts
import type { WeatherSeverity } from "./cancellationEvaluator";

/**
 * Calls Open-Meteo historical weather API for a given date + lat/lon.
 * Returns max hourly rain (mm) and a mapped WeatherSeverity.
 */
export async function inferWeatherFromOpenMeteo(
  lat: number,
  lon: number,
  date: string
): Promise<{
  severity: WeatherSeverity;
  maxRainMm: number;
  explanation: string;
} | null> {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&start_date=${date}` +
    `&end_date=${date}` +
    "&hourly=rain,precipitation,weathercode";

  const res = await fetch(url);

  if (!res.ok) {
    console.error("Open-Meteo error", res.status, await res.text());
    return null;
  }

  const data = await res.json();

  if (!data?.hourly?.time || !data?.hourly?.rain) {
    return null;
  }

  const rain: number[] = data.hourly.rain;
  const times: string[] = data.hourly.time;

  if (!Array.isArray(rain) || rain.length === 0) {
    return {
      severity: "none",
      maxRainMm: 0,
      explanation: "No rain data reported for the selected date.",
    };
  }

  let maxRain = 0;
  let maxIndex = 0;
  for (let i = 0; i < rain.length; i++) {
    const value = typeof rain[i] === "number" ? rain[i] : 0;
    if (value > maxRain) {
      maxRain = value;
      maxIndex = i;
    }
  }

  const maxTime = times[maxIndex];

  const severity = classifyByRain(maxRain);
  const explanation = buildExplanation(severity, maxRain, maxTime);

  return { severity, maxRainMm: maxRain, explanation };
}

function classifyByRain(mm: number): WeatherSeverity {
  if (mm >= 20) return "storm";       // very heavy rain / storm
  if (mm >= 7) return "heavy";        // heavy rain
  if (mm >= 1) return "light";        // light to moderate rain
  return "none";                      // effectively dry
}

function buildExplanation(
  severity: WeatherSeverity,
  maxRainMm: number,
  timeIso: string
): string {
  const when = timeIso ? `around ${timeIso}` : "during the day";

  if (severity === "storm") {
    return `Open-Meteo reports very heavy rain (~${maxRainMm.toFixed(
      1
    )} mm/h) ${when}, consistent with a storm-level disruption.`;
  }
  if (severity === "heavy") {
    return `Open-Meteo reports heavy rain (~${maxRainMm.toFixed(
      1
    )} mm/h) ${when}, which strongly supports a genuine weather cancellation.`;
  }
  if (severity === "light") {
    return `Open-Meteo reports light rain (~${maxRainMm.toFixed(
      1
    )} mm/h) ${when}. This is a weak-to-moderate justification for cancellation.`;
  }
  return "Open-Meteo reports almost no rain on this date – weather alone does not justify cancellation.";
}
