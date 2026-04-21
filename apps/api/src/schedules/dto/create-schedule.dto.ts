import { IsString, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 'staff-id-here' })
  @IsString()
  staffId: string;

  @ApiProperty({ example: '2026-04-21T09:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ example: '2026-04-21T18:00:00.000Z' })
  @IsISO8601()
  endAt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  memo?: string;
}
