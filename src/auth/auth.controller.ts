import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  ///authorization : Basic $token
  registerUser(
    @Headers('authorization') token: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.authService.register(token, phoneNumber);
  }
}
