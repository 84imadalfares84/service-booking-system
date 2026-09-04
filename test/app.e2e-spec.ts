import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Service Booking API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let serviceId: string;
  let bookingId: string;
  const suffix = Date.now();
  const userEmail = `user-${suffix}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL ?? 'emad.allfares84@gmail.com',
        password: process.env.ADMIN_PASSWORD ?? 'Admin12345!',
      })
      .expect(201);
    adminToken = adminLogin.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers and logs in a user', async () => {
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Sara Ahmad',
        email: userEmail,
        password: 'Secret123',
      })
      .expect(201);

    expect(register.body.user.role).toBe('USER');
    userToken = register.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: 'Secret123' })
      .expect(201);
  });

  it('rejects invalid registration payloads', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('forbids a regular user from creating a service', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Massage',
        description: 'Relaxing full-body massage session.',
        price: 40,
        durationMinutes: 60,
      })
      .expect(403);
  });

  it('lets an admin create, read, and update a service', async () => {
    const created = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Massage',
        description: 'Relaxing full-body massage session.',
        price: 40,
        durationMinutes: 60,
      })
      .expect(201);

    serviceId = created.body.id as string;
    expect(created.body.price).toBe(40);

    await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 45 })
      .expect(200);
  });

  it('lets a user create and list their own bookings', async () => {
    const bookingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const created = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ serviceId, bookingDate })
      .expect(201);

    bookingId = created.body.id as string;
    expect(created.body.status).toBe(BookingStatus.PENDING);
    expect(created.body.userId).toBeDefined();

    const mine = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(mine.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(mine.body.data.some((row: { id: string }) => row.id === bookingId)).toBe(
      true,
    );
  });

  it('hides other users bookings from GET /bookings/me', async () => {
    const other = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Other User',
        email: `other-${suffix}@example.com`,
        password: 'Secret123',
      })
      .expect(201);

    const otherMine = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .expect(200);

    expect(
      otherMine.body.data.some((row: { id: string }) => row.id === bookingId),
    ).toBe(false);

    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .expect(404);
  });

  it('forbids a regular user from listing admin bookings', async () => {
    await request(app.getHttpServer())
      .get('/admin/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('supports admin pagination, status filtering, and valid transitions', async () => {
    const list = await request(app.getHttpServer())
      .get('/admin/bookings')
      .query({ status: BookingStatus.PENDING, page: 1, limit: 10 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(list.body.meta.page).toBe(1);
    expect(Array.isArray(list.body.data)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/admin/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: BookingStatus.COMPLETED })
      .expect(400);

    const confirmed = await request(app.getHttpServer())
      .patch(`/admin/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: BookingStatus.CONFIRMED })
      .expect(200);

    expect(confirmed.body.status).toBe(BookingStatus.CONFIRMED);
  });

  it('lets the owner cancel a confirmed booking', async () => {
    const cancelled = await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(cancelled.body.status).toBe(BookingStatus.CANCELLED);

    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });

  it('rejects deleting a service that already has bookings', async () => {
    await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('reports health', async () => {
    const health = await request(app.getHttpServer()).get('/health').expect(200);
    expect(health.body.status).toBe('ok');
    expect(prisma).toBeDefined();
  });
});
