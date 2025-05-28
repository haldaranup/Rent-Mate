import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

// Define the expected shape of the JWT payload
export interface JwtPayload {
  email: string;
  sub: string; // Standard JWT subject field (usually user ID)
  // Add any other fields you might include in the JWT payload
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      // In a real app, you might want to throw an error or log this more formally
      // to ensure the application doesn't run with an undefined JWT secret.
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
    // This method is called by Passport after successfully verifying the JWT
    // The payload is the decoded JWT content
    const user = await this.usersService.findOneByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user; // Exclude password from the user object returned to the request context
    return result;
    // The returned object will be attached to the request object as request.user
  }
}
