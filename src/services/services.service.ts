import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toServiceResponse } from '../common/serializers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const services = await this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return services.map(toServiceResponse);
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return toServiceResponse(service);
  }

  async create(dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        price: new Prisma.Decimal(dto.price),
        durationMinutes: dto.durationMinutes,
        isActive: dto.isActive ?? true,
      },
    });
    return toServiceResponse(service);
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.ensureExists(id);
    const service = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.price !== undefined
          ? { price: new Prisma.Decimal(dto.price) }
          : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return toServiceResponse(service);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const bookingCount = await this.prisma.booking.count({
      where: { serviceId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete a service that already has bookings. Deactivate it instead.',
      );
    }
    await this.prisma.service.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }
}
