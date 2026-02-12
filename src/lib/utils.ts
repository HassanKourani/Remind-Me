import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function formatAddress(address: {
  streetNumber?: string;
  street?: string;
  city?: string;
  region?: string;
}): string {
  const parts = [
    address.streetNumber,
    address.street,
    address.city,
    address.region,
  ].filter(Boolean);
  return parts.join(', ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
