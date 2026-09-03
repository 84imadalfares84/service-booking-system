import { BookingStatus } from '@prisma/client';
import {
  canTransition,
  describeInvalidTransition,
  getAllowedTransitions,
} from './booking-status';

describe('booking status transitions', () => {
  it('allows pending to confirmed or cancelled', () => {
    expect(canTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toBe(
      true,
    );
    expect(canTransition(BookingStatus.PENDING, BookingStatus.CANCELLED)).toBe(
      true,
    );
    expect(getAllowedTransitions(BookingStatus.PENDING)).toEqual([
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
    ]);
  });

  it('allows confirmed to completed or cancelled', () => {
    expect(
      canTransition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED),
    ).toBe(true);
    expect(
      canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
    ).toBe(true);
  });

  it('rejects completed and cancelled as terminal states', () => {
    expect(
      canTransition(BookingStatus.COMPLETED, BookingStatus.CANCELLED),
    ).toBe(false);
    expect(
      canTransition(BookingStatus.CANCELLED, BookingStatus.PENDING),
    ).toBe(false);
    expect(
      canTransition(BookingStatus.PENDING, BookingStatus.COMPLETED),
    ).toBe(false);
  });

  it('rejects same-status updates', () => {
    expect(canTransition(BookingStatus.PENDING, BookingStatus.PENDING)).toBe(
      false,
    );
    expect(describeInvalidTransition(BookingStatus.PENDING, BookingStatus.PENDING)).toBe(
      'Booking is already PENDING',
    );
  });

  it('describes invalid transitions clearly', () => {
    expect(
      describeInvalidTransition(
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
      ),
    ).toContain('cannot change status');
  });
});
