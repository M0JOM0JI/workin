import { IsInt, IsOptional, IsDateString, IsString, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InsuranceType } from '@prisma/client';

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

  @ApiProperty({ example: 160, required: false, description: '월간 계약 근무시간 (시간)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  contractHoursPerMonth?: number;

  @ApiProperty({ enum: InsuranceType, required: false })
  @IsOptional()
  @IsEnum(InsuranceType)
  insuranceType?: InsuranceType;

  @ApiProperty({ example: '화요일 수업 있음', required: false, nullable: true })
  @IsOptional()
  @IsString()
  memo?: string | null;
}
