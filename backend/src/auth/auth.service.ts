import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    return this.usersService.create(createUserDto);
  }

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private async generateToken(user: Omit<User, 'password'> | User): Promise<string> {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.findOneByEmail(loginUserDto.email);

    if (!user) {
      throw new NotFoundException(`User with email ${loginUserDto.email} not found.`);
    }

    const isPasswordMatching = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password, ...userWithoutPassword } = user;
    const accessToken = await this.generateToken(userWithoutPassword);

    return { accessToken, user: userWithoutPassword };
  }

  async getUserProfile(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByIdWithHousehold(userId);
    if (!user) {
      return null; // Or throw NotFoundException if user must exist
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
} 