import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { envVariablekeys } from 'src/common/const/env.const';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}
  parseBasicToken(rawToken: string) {
    //1)토큰 '' 기준으로 스플릿 하여 토큰 값만 추출 할것
    const basicSplit = rawToken.split(' ');

    //basicSplit 정상적으로왔다면 ['Basic','$token']
    if (basicSplit.length !== 2) {
      throw new NotFoundException('토큰 포멧이 잘못되었다1.');
    }

    const [basic, token] = basicSplit;

    if (basic.toLowerCase() !== 'basic') {
      throw new NotFoundException('토큰 포멧이 잘못되었다2.');
    }

    //2) 추출한 토큰을 base64 디코딩해서 이메일과 비밀번호로 나눈다.
    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    /// 디코딩이 되고나면 여기까지는 email:password 가 되었다. 그러면 다시 아래에서 다시 나눠준다.
    const tokenSplit = decoded.split(':');

    if (tokenSplit.length !== 2) {
      throw new NotFoundException('토큰 포멧이 잘못되었다3.');
    }

    const [email, password] = tokenSplit;

    return {
      email,
      password,
    };
  }

  //회원가입
  //rawToken -> "Basic Stoken"
  async register(rawToken: string, phoneNumber: string, name: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });
    if (user) {
      throw new BadRequestException('이미 가입한 이메일입니다.');
    }

    //입력받은 비밀번호 암호화진행
    const hash = await bcrypt.hash(
      password,
      this.configService.get<number>(envVariablekeys.hasRounds),
    );

    await this.userRepository.save({
      email,
      password: hash,
      phoneNumber,
      name,
    });

    return this.userRepository.findOne({
      where: {
        email,
      },
    });
  }
}
