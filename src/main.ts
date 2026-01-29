import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const API_PATH = configService.get<string>('API_PATH', 'api');
  const REFRESH_COOKIE_NAME = configService.get<string>(
    'REFRESH_COOKIE_NAME',
    'refresh-cookie',
  );

  const config = new DocumentBuilder()
    .setTitle(' Open Api')
    .setDescription('Документация API для работы')
    .setVersion(configService.get<string>('APP_VERSION') ?? '0.0.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe());
  app.set('query parser', 'extended');

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API_PATH, app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
