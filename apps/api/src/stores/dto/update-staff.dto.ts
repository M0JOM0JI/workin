import { IsInt, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStaffDto {
  @ApiProperty({ example: 10030, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyWage?: number;

  @ApiProperty({ example: '2026-04-23T00:00:00.000Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  leftAt?: string | null;
}
