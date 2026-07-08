import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class merge helper used by shadcn-style components.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

