import type { ServiceLocation, Token } from "../backend";

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Hospital: "🏥",
    Salon: "💇",
    Shop: "🛒",
    Clinic: "🏥",
    Bank: "🏦",
    Pharmacy: "💊",
    Restaurant: "🍽️",
    Government: "🏛️",
  };
  return map[category] ?? "🏢";
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    Hospital: "bg-red-50 text-red-700 border-red-200",
    Salon: "bg-purple-50 text-purple-700 border-purple-200",
    Shop: "bg-green-50 text-green-700 border-green-200",
    Clinic: "bg-blue-50 text-blue-700 border-blue-200",
    Bank: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Pharmacy: "bg-teal-50 text-teal-700 border-teal-200",
    Restaurant: "bg-orange-50 text-orange-700 border-orange-200",
    Government: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return map[category] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

export function calcPeopleAhead(
  token: Token,
  currentServingToken: bigint,
): number {
  const tokenNum = Number(token.tokenNumber);
  const serving = Number(currentServingToken);
  if (serving === 0) return tokenNum - 1;
  const ahead = tokenNum - serving - 1;
  return Math.max(0, ahead);
}

export function calcETA(peopleAhead: number, avgMinutes: number): number {
  return peopleAhead * avgMinutes;
}

export function isApproaching(
  token: Token,
  currentServingToken: bigint,
): boolean {
  const ahead = calcPeopleAhead(token, currentServingToken);
  return token.status === "waiting" && ahead <= 3 && ahead >= 0;
}

export function formatWait(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
