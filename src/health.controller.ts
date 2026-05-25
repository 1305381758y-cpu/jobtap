import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'jobtap-module-c',
      timestamp: new Date().toISOString(),
    };
  }
}
