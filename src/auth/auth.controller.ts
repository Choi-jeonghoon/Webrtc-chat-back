import {
  Body,
  Controller,
  Headers,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  ///authorization : Basic $token
  registerUser(
    @Headers('authorization') token: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('name') name: string,
  ) {
    return this.authService.register(token, phoneNumber, name);
  }

  @Post('login')
  loginUser(@Headers('authorization') token: string) {
    if (!token) {
      console.log('1');
      throw new NotFoundException('Authorization header가 누락되었습니다.');
    }

    return this.authService.login(token);
  }

  @Post('refresh')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
