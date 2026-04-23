import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAttendanceDto {
  @ApiProperty({ example: '2026-04-23T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @ApiProperty({ example: '2026-04-23T09:00:00.000Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  clockOut?: string | null;
}
