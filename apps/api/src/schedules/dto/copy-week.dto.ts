import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CopyWeekDto {
  @ApiProperty({ example: '2026-04-21', description: '복사할 주의 월요일 날짜 (yyyy-MM-dd)' })
  @IsDateString()
  fromDate!: string;
}
