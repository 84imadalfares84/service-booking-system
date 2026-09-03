import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import {
  canTransition,
  describeInvalidTransition,
} from '../common/booking-status';
import { paginate } from '../common/pagination';
import { toBookingResponse } from '../common/serializers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

const bookingInclude = {
  user: true,
  service: true,
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBookingDto) {
    const bookingDate = this.parseFutureDate(dto.bookingDate);
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Cannot book an inactive service');
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        serviceId: service.id,
        bookingDate,
        status: BookingStatus.PENDING,
      },
      include: bookingInclude,
    });

    return toBookingResponse(booking);
  }

  async findMine(userId: string, query: QueryBookingsDto) {
    return this.listBookings({ userId, ...this.statusFilter(query.status) }, query);
  }

  async findAllAdmin(query: QueryBookingsDto) {
    return this.listBookings(this.statusFilter(query.status), query);
  }

  async cancelOwn(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    return this.changeStatus(booking.id, booking.status, BookingStatus.CANCELLED);
  }

  async updateStatusAdmin(bookingId: string, nextStatus: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return this.changeStatus(booking.id, booking.status, nextStatus);
  }

  private async listBookings(
    where: Prisma.BookingWhereInput,
    query: QueryBookingsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { bookingDate: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return paginate(bookings.map(toBookingResponse), total, page, limit);
  }

  private async changeStatus(
    id: string,
    current: BookingStatus,
    next: BookingStatus,
  ) {
    if (!canTransition(current, next)) {
      throw new BadRequestException(describeInvalidTransition(current, next));
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: next },
      include: bookingInclude,
    });
    return toBookingResponse(updated);
  }

  private parseFutureDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('bookingDate must be a valid ISO-8601 date');
    }
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('bookingDate must be in the future');
    }
    return date;
  }

  private statusFilter(status?: BookingStatus): Prisma.BookingWhereInput {
    return status ? { status } : {};
  }
}
