import type { StationCode } from "./stations";
export type NumericalModel = "a3km" | "e3km";
const BASE = "https://www.meteo.co.me/Meteorologija/Pr/Gradovi";
export function buildNumericalUrl(model: NumericalModel, station: StationCode | string, day: number): string {
  if (day < 1 || day > 5) throw new Error(`day must be 1-5, got ${day}`);
  const folder = model === "a3km" ? "5danaA" : "5danaE";
  const letter = model === "a3km" ? "A" : "E";
  return `${BASE}/${folder}/${String(station).toUpperCase()}-${letter}${day}.html`;
}
