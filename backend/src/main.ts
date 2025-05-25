import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet for security headers (contentSecurityPolicy needs to be configured if too restrictive)
  app.use(helmet()); 
  // If helmet.contentSecurityPolicy is causing issues with Swagger UI or other scripts, 
  // you might need to configure it or disable it for development:
  // app.use(helmet({ contentSecurityPolicy: false })); 

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '', // Allow requests from your frontend Next.js dev server
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // If you need to send cookies or authorization headers
  });

  // Global Validation Pipe (if you haven't set it up individually in controllers like AuthController)
  // This ensures DTOs are validated for all incoming requests if they have validation decorators.
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips properties that do not have any decorators
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted values are provided
    transform: true, // Automatically transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true, // Allow implicit conversion of types based on TS type
    },
  }));

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('RentMate API')
    .setDescription('API documentation for the RentMate application')
    .setVersion('1.0')
    // .addTag('auth', 'Authentication related endpoints') // Example tag
    // .addTag('users', 'User management endpoints')
    .addBearerAuth() // For JWT
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    // extraModels: [] // Reverted: extraModels is for DTO classes, interfaces are handled by schema refs in controllers
  });
  SwaggerModule.setup('api-docs', app, document); // Setup Swagger UI at /api-docs

  const port = process.env.PORT || 8080; // Use environment variable or default to 8080
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api-docs`);
}
bootstrap();
