import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Standard utility for combining conditional classes and merging conflicting Tailwind CSS classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
