import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE', // 허용할 HTTP 메서드
    allowedHeaders: 'Content-Type, Accept,Authorization', // 허용할 헤더
    credentials: true, // 쿠키와 함께 요청을 보낼 수 있도록 설정
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
