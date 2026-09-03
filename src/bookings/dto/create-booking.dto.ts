import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: '2026-12-01T10:00:00.000Z',
    description: 'ISO-8601 date in the future',
  })
  @IsISO8601()
  bookingDate: string;
}
