import clsx, { type ClassValue } from 'clsx'

/** Conditional className helper (mirrors the SnDevelopment web). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
