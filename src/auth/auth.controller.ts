import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  listUsers() {
    return this.authService.listAdmins();
  }

  @UseGuards(JwtAuthGuard)
  @Post('users')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.authService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.authService.updateAdmin(id, dto);
  }
}
