import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// 🔇 Silence console output in production (keep warnings and errors)
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const noop = () => {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).debug = noop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).info = noop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).log = noop;
  // keep warn and error for visibility in prod
}

async function bootstrap() {
  // ✅ Use NestExpressApplication for static file serving
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Configure Nest logger levels based on environment
    logger: isProd
      ? ['error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  /* -----------------------------------------------------
     ✅ Ensure upload directories exist (avoid Multer errors)
  ----------------------------------------------------- */
  const uploadRoot = join(process.cwd(), 'uploads');
  const employeeDir = join(uploadRoot, 'employees');

  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
    console.log('📁 Created uploads folder:', uploadRoot);
  }

  if (!fs.existsSync(employeeDir)) {
    fs.mkdirSync(employeeDir, { recursive: true });
    console.log('📁 Created employee uploads folder:', employeeDir);
  }

  /* -----------------------------------------------------
     ✅ Global Validation
  ----------------------------------------------------- */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  /* -----------------------------------------------------
     ✅ Global Error Formatting
  ----------------------------------------------------- */
  app.useGlobalFilters(new HttpExceptionFilter());

  /* -----------------------------------------------------
     ✅ CORS Setup
  ----------------------------------------------------- */
  app.enableCors({
    origin: [
      'http://localhost:3000', // frontend dev
      'https://hrm.indyanet.com', // production
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  /* -----------------------------------------------------
     ✅ Static File Serving
  ----------------------------------------------------- */
  app.useStaticAssets(uploadRoot, {
    prefix: '/uploads/',
  });

  /* -----------------------------------------------------
     ✅ Start Server
  ----------------------------------------------------- */
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API running at: http://localhost:${port}`);
  console.log(
    `📂 Uploaded files available at: http://localhost:${port}/uploads/`,
  );
  console.log(`📄 Physical upload directory: ${employeeDir}`);
}

bootstrap();
