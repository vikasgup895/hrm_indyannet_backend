import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // ✅ Use NestExpressApplication for static file serving
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /* -----------------------------------------------------
     ✅ CORS Setup
  ----------------------------------------------------- */
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API running at: http://localhost:${port}`);
  console.log(
    `📂 Uploaded files available at: http://localhost:${port}/uploads/`,
  );
  console.log(`📄 Physical upload directory: ${employeeDir}`);
}

bootstrap();
