import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/entities/user.entity'; // For typing req.user
// import { AuthGuard } from '@nestjs/passport'; // For protecting routes, not used on login/signup itself

@Controller('auth') // Base route for authentication related endpoints
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED) // Set default response code to 201 Created
  async signUp(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createUserDto: CreateUserDto,
  ) {
    // ValidationPipe will use decorators from CreateUserDto
    // whitelist: true strips properties that are not in the DTO
    // forbidNonWhitelisted: true throws an error if non-whitelisted properties are present
    const user = await this.authService.signUp(createUserDto);
    return { message: 'User registered successfully', user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    loginUserDto: LoginUserDto,
  ) {
    return this.authService.login(loginUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me') // Endpoint to get current user profile
  async getProfile(
    @Request() req: any,
  ): Promise<Omit<User, 'password'> | null> {
    // req.user is populated by JwtStrategy with Omit<User, 'password'>
    // We might want to fetch the full user with relations like household here.
    // For now, JwtStrategy provides the user object, which might or might not have household eager loaded.
    // Let's ask AuthService to handle fetching the user with their household.
    return this.authService.getUserProfile(req.user.id);
  }

  // Example of a protected route that requires JWT authentication
  // @UseGuards(AuthGuard('jwt'))
  // @Get('profile')
  // getProfile(@Request() req) {
  //   return req.user; // req.user is populated by JwtStrategy
  // }
}
