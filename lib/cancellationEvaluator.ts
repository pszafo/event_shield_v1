// lib/cancellationEvaluator.ts

export type WeatherSeverity = "none" | "light" | "heavy" | "storm";

export type CancellationInput = {
  reason: string;                  // free text from organizer
  weatherSeverity: WeatherSeverity;
  participantYesRatio: number;     // 0–1 (e.g. 0.7 = 70% confirmed cancelled)
  hoursBeforeEvent: number;        // hours before event cancellation was triggered
  organizerCancellationRate: number; // 0–1 (past cancellations / total past events)
};

export type CancellationEvaluation = {
  reliabilityScore: number;        // 0–100, higher = more likely genuine
  decision: "LIKELY_GENUINE" | "UNCERTAIN" | "POTENTIALLY_FRAUD";
  factorNotes: string[];
};

export function evaluateCancellation(
  input: CancellationInput
): CancellationEvaluation {
  let score = 50; // start neutral
  const notes: string[] = [];

  // 1) Weather factor
  switch (input.weatherSeverity) {
    case "heavy":
      score += 20;
      notes.push("Heavy rain reported – supports genuine weather cancellation.");
      break;
    case "storm":
      score += 30;
      notes.push("Storm / severe weather – strong signal of genuine cancellation.");
      break;
    case "light":
      score += 5;
      notes.push("Light rain – weak support for cancellation.");
      break;
    case "none":
      score -= 15;
      notes.push("No bad weather reported – weather does NOT justify cancellation.");
      break;
  }

  // 2) Participant confirmations
  if (input.participantYesRatio >= 0.7) {
    score += 25;
    notes.push("Most participants confirmed the event was cancelled.");
  } else if (input.participantYesRatio >= 0.4) {
    score += 10;
    notes.push("Many participants confirmed cancellation.");
  } else if (input.participantYesRatio >= 0.2) {
    score -= 5;
    notes.push("Low participant confirmation – cancellation is questionable.");
  } else {
    score -= 15;
    notes.push("Very few participants confirmed cancellation.");
  }

  // 3) Timing – how close to the event
  if (input.hoursBeforeEvent <= 2) {
    score += 10;
    notes.push("Cancellation close to event time – typical for last-minute issues.");
  } else if (input.hoursBeforeEvent > 24) {
    score -= 5;
    notes.push("Cancellation far in advance – may indicate demand / business reasons.");
  }

  // 4) Organizer track record
  if (input.organizerCancellationRate <= 0.05) {
    score += 10;
    notes.push("Organizer almost never cancels – good track record.");
  } else if (input.organizerCancellationRate >= 0.25) {
    score -= 20;
    notes.push("Organizer cancels frequently – higher fraud risk.");
  }

  // Clamp score between 0 and 100
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let decision: CancellationEvaluation["decision"];
  if (score >= 70) {
    decision = "LIKELY_GENUINE";
  } else if (score <= 40) {
    decision = "POTENTIALLY_FRAUD";
  } else {
    decision = "UNCERTAIN";
  }

  return {
    reliabilityScore: Math.round(score),
    decision,
    factorNotes: notes,
  };
}
