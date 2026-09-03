import { BookingStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.COMPLETED]: [],
};

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(from: BookingStatus): BookingStatus[] {
  return [...ALLOWED_TRANSITIONS[from]];
}

export function describeInvalidTransition(
  from: BookingStatus,
  to: BookingStatus,
): string {
  const allowed = getAllowedTransitions(from);
  if (from === to) {
    return `Booking is already ${from}`;
  }
  if (allowed.length === 0) {
    return `A ${from} booking cannot change status`;
  }
  return `Cannot change booking status from ${from} to ${to}. Allowed: ${allowed.join(', ')}`;
}
