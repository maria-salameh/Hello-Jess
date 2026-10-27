import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User, toUserDto } from '../users/user.entity';
import { CurrentUser, JwtAuthGuard } from './auth.guard';
import {
  type LoginInput,
  type ProfileUpdateInput,
  type RegisterInput,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
} from './auth.schemas';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return toUserDto(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body(new ZodValidationPipe(profileUpdateSchema)) body: ProfileUpdateInput) {
    return this.auth.updateProfile(user, body);
  }
}
