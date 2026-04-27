import { Module } from '@nestjs/common';
import { AutoClockoutService } from './auto-clockout.service';

@Module({
  providers: [AutoClockoutService],
})
export class AutoClockoutModule {}
