import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function splitTitle(title: string): { main: string; sub: string } {
  const dashParts = title.split(" - ");
  if (dashParts.length >= 2) {
    return { main: dashParts[0].trim(), sub: dashParts.slice(1).join(" - ").trim() };
  }
  const seasonMatch = title.match(/^(.+?)\s+(Season\s+\d+(?:\s+Part\s+\d+)?)$/i);
  if (seasonMatch) return { main: seasonMatch[1].trim(), sub: seasonMatch[2].trim() };
  const partMatch = title.match(/^(.+?)\s+(Part\s+\d+)$/i);
  if (partMatch) return { main: partMatch[1].trim(), sub: partMatch[2].trim() };
  return { main: title, sub: "" };
}
