import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async checkEmail(email: string) {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        // 중복된 이메일이 있으면 성공 상태로 처리 (실제 에러가 아닌 중복 확인 처리)
        return {
          message: '이미 사용 중인 이메일입니다.',
          status: 'error',
          errorCode: 409,
        };
      }

      if (!email.includes('@')) {
        throw new BadRequestException({
          message: '이메일 형식이 잘못되었습니다.',
          status: 'error',
          errorCode: 400,
        });
      }

      return { message: '사용 가능한 이메일입니다.', status: 'success' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: '서버 내부 오류가 발생했습니다.',
        status: 'error',
        errorCode: 500,
      });
    }
  }

  create(createUserDto: CreateUserDto) {
    return this.userRepository.save(createUserDto);
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('찾고자하는 id 가 없습니다.');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('찾고자하는 id 가 없습니다.');
    }

    await this.userRepository.update({ id }, updateUserDto);

    return (
      this,
      this.userRepository.findOne({
        where: { id },
      })
    );
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }
}
