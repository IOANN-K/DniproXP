import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { Settings } from './config/settings.js';
import { ApiExceptionFilter } from './common/http.js';
import type { ApiRequest } from './common/http.js';
import { validationException } from './common/validation.js';
import { cookieName } from './auth/refresh-cookie.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const settings = app.get(Settings);
  app.disable('x-powered-by');
  if (settings.values.TRUST_PROXY_HOPS > 0)
    app.set('trust proxy', settings.values.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use((req: ApiRequest, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useBodyParser('json', { limit: '16kb' });
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: settings.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-DniproXP-CSRF'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
      exceptionFactory: validationException,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  if (settings.values.SWAGGER_ENABLED === 'true') {
    const options = new DocumentBuilder()
      .setTitle('DniproXP API')
      .setDescription(
        'BE-01: Identity, users, organization scope. Auth cookie mutations require an allowlisted Origin and X-DniproXP-CSRF: 1. ADMIN has no organization-scope bypass.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth(
        cookieName(settings.values),
        { type: 'apiKey', in: 'cookie' },
        'refresh',
      )
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: false },
    });
  }
  await app.listen(settings.values.API_PORT);
  Logger.log(
    `DniproXP API listening on port ${settings.values.API_PORT}`,
    'Bootstrap',
  );
}
void bootstrap().catch(() => {
  Logger.error(
    'API startup failed. Check environment configuration and database connectivity.',
    'Bootstrap',
  );
  process.exitCode = 1;
});
