import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  if (typeof window !== "undefined") return path; //we are on client side
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}${path}`; // we are on server and deplioyed on vercel
  return `http://localhost:${process.env.PORT ?? 3000}${path}`;
}
