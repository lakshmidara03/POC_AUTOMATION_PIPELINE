import { Controller, Get } from '@nestjs/common';
import { SHARED_PACKAGE_READY } from '@poc/shared';

@Controller('health')
export class AppController {
  @Get()
  getHealth() {
    console.log('Shared Package check in Health Controller:', SHARED_PACKAGE_READY);
    return { status: 'ok' };
  }
}
