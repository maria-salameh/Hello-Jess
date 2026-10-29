import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { User, toUserDto } from '../users/user.entity';
import { CurrentUser, JwtAuthGuard } from './auth.guard';
import {
  type LoginInput,
  type ProfileUpdateInput,
  type RegisterInput,
  type ResendInput,
  type VerifyInput,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resendSchema,
  verifySchema,
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

  // Second step of sign-up and of login: the code emailed to the user. Success returns the access token.
  @Post('verify')
  @HttpCode(200)
  verify(@Body(new ZodValidationPipe(verifySchema)) body: VerifyInput) {
    return this.auth.verify(body);
  }

  @Post('resend')
  @HttpCode(200)
  resend(@Body(new ZodValidationPipe(resendSchema)) body: ResendInput) {
    return this.auth.resend(body);
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
