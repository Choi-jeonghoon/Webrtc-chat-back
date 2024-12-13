import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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

  //로그인
  async login(rawToken: string) {
    try {
      const { email, password } = this.parseBasicToken(rawToken);

      const user = await this.userRepository.findOne({
        where: {
          email,
        },
      });

      if (!user) {
        // 존재하지 않는 이메일 처리
        throw new UnauthorizedException({
          message: '이메일 또는 비밀번호가 잘못되었습니다.',
          status: 'error',
          errorCode: 401,
        });
      }

      const passOk = await bcrypt.compare(password, user.password);
      if (!passOk) {
        // 비밀번호가 잘못된 경우 처리
        throw new UnauthorizedException({
          message: '이메일 또는 비밀번호가 잘못되었습니다.',
          status: 'error',
          errorCode: 401,
        });
      }

      // 토큰 발급
      const refreshTokenSecret = this.configService.get<string>(
        'REFRESH_TOKEN_SECRET',
      );
      const accessTokenSecret = this.configService.get<string>(
        'ACCESS_TOKEN_SECRET',
      );

      const refreshToken = await this.jwtService.signAsync(
        { sub: user.id, role: user.role, type: 'refresh' },
        { secret: refreshTokenSecret, expiresIn: '24h' },
      );

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, role: user.role, type: 'access' },
        { secret: accessTokenSecret, expiresIn: '300s' },
      );

      // 성공 응답
      return {
        status: 'success',
        data: { accessToken, refreshToken },
      };
    } catch (error) {
      // 로그인 실패 시 오류 처리
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 기타 오류 처리
      throw new InternalServerErrorException({
        message: '서버 내부 오류가 발생했습니다.',
        status: 'error',
        errorCode: 500,
      });
    }
  }

  //리프레쉬 토큰을 활용한 엑세스 토큰 재발급
  async refreshAccessToken(refreshToken: string) {
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );

    // 리프레시 토큰 검증
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: refreshTokenSecret,
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 리프레시 토큰입니다.', e);
    }

    // 사용자 정보 확인 (추가 검증)
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 새로운 액세스 토큰 생성
    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );

    return {
      accessToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          type: 'access',
        },
        { secret: accessTokenSecret, expiresIn: 300 }, // 5분
      ),
    };
  }
}
