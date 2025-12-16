import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('CORS Configuration (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts
    app.setGlobalPrefix('api');

    // Allow both midiverse.org and www.midiverse.org for production
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'https://midiverse.org',
      'https://www.midiverse.org',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should include CORS headers on API endpoint', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'http://localhost:3001')
      .expect(200)
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBe(
          'http://localhost:3001',
        );
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      });
  });

  it('should include CORS headers on preflight request', () => {
    return request(app.getHttpServer())
      .options('/api')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBe(
          'http://localhost:3001',
        );
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      });
  });

  it('should only allow whitelisted origin', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'http://localhost:3001')
      .expect((res) => {
        // Should have CORS headers for whitelisted origin
        expect(res.headers['access-control-allow-origin']).toBe(
          'http://localhost:3001',
        );
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      });
  });

  it('should allow midiverse.org origin', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'https://midiverse.org')
      .expect(200)
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBe(
          'https://midiverse.org',
        );
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      });
  });

  it('should allow www.midiverse.org origin', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'https://www.midiverse.org')
      .expect(200)
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBe(
          'https://www.midiverse.org',
        );
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      });
  });

  it('should reject non-whitelisted origin', () => {
    return request(app.getHttpServer())
      .get('/api')
      .set('Origin', 'https://evil.com')
      .expect(500); // CORS error should result in 500
  });
});
