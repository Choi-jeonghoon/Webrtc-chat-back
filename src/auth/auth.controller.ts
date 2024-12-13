import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService, // ConfigService 주입
  ) {}

  @Post('register')
  registerUser(
    @Headers('authorization') token: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('name') name: string,
  ) {
    return this.authService.register(token, phoneNumber, name);
  }

  @Post('login')
  async loginUser(
    @Headers('authorization') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      console.log('Authorization header가 누락되었습니다.');
      throw new NotFoundException('Authorization header가 누락되었습니다.');
    }

    // 로그인 처리
    const loginResponse = await this.authService.login(token);

    // 로그인 성공 시 쿠키에 토큰 저장
    if (loginResponse.status === 'success') {
      const { accessToken, refreshToken } = loginResponse.data;

      // accessToken 쿠키 설정 (HttpOnly)
      res.cookie('accessToken', accessToken, {
        httpOnly: true, // 자바스크립트에서 쿠키 접근 불가
        secure: false, // 로컬 개발 환경에서는 false로 설정
        maxAge: 60 * 60 * 1000, // 1시간 유효
        sameSite: 'strict', // SameSite 설정으로 CSRF 공격 방지
      });

      // refreshToken 쿠키 설정 (HttpOnly)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // 자바스크립트에서 쿠키 접근 불가
        secure: false, // 로컬 개발 환경에서는 false로 설정
        maxAge: 60 * 60 * 24 * 7 * 1000, // 7일 유효
        sameSite: 'strict', // SameSite 설정으로 CSRF 공격 방지
      });
      // 쿠키 설정 후 로그 출력
      // console.log('Access Token:', accessToken);
      // console.log('Refresh Token:', refreshToken);

      return res.json({ status: 'success' });
    }

    // 실패 응답을 그대로 반환
    return res.json(loginResponse);
  }
  // 사용자가 로그인 했는지 확인하는 API(즉, 엑세스토큰이 유요한지)
  @Get('check-login')

  //엑세스토큰을 발급하기 위한 API
  @Post('refresh')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
