import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { resolveRequestSource } from '../common/request-source';
import { AuthService } from './auth.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OwnerGuard } from './owner.guard';

@Controller('api/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, resolveRequestSource(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  listUsers() {
    return this.authService.listAdmins();
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Post('users')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.authService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @Patch('users/:id')
  updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminUserDto) {
    return this.authService.updateAdmin(id, dto);
  }
}
