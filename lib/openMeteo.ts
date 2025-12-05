export type WeatherSeverity = "none" | "light" | "heavy" | "storm";

export async function inferWeatherFromOpenMeteo(
  lat: number,
  lon: number,
  date: string
) {
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&start_date=${date}` +
    `&end_date=${date}` +
    "&hourly=rain,weathercode";

  const res = await fetch(url);
  const data = await res.json();

  if (!data?.hourly) return null;

  const rain = data.hourly.rain || [];
  const max = Math.max(...rain);

  let severity: WeatherSeverity = "none";
  if (max >= 20) severity = "storm";
  else if (max >= 7) severity = "heavy";
  else if (max >= 1) severity = "light";

  return {
    severity,
    explanation: `Rain peak was ${max} mm/hr (severity: ${severity}).`,
  };
}
