import { Booking, Role, Service, User } from '@prisma/client';

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
};

export type ServiceResponse = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function toServiceResponse(service: Service): ServiceResponse {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price),
    durationMinutes: service.durationMinutes,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export function toBookingResponse(
  booking: Booking & { user?: User; service?: Service },
) {
  return {
    id: booking.id,
    userId: booking.userId,
    serviceId: booking.serviceId,
    bookingDate: booking.bookingDate,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    user: booking.user ? toUserResponse(booking.user) : undefined,
    service: booking.service ? toServiceResponse(booking.service) : undefined,
  };
}
