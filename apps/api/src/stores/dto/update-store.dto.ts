import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AutoClockOutMode } from '@prisma/client';
import { CreateStoreDto } from './create-store.dto';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  // 급여일
  @ApiProperty({ example: 25, required: false, description: '급여일 (1~31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  payDay?: number;

  // 자동 퇴근 설정
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoClockOut?: boolean;

  @ApiProperty({ enum: AutoClockOutMode, required: false })
  @IsOptional()
  @IsEnum(AutoClockOutMode)
  autoClockOutMode?: AutoClockOutMode;

  @ApiProperty({ example: 30, required: false, description: 'SCHEDULE 모드: 종료 후 N분' })
  @IsOptional()
  @IsInt()
  @Min(0)
  autoClockOutBuffer?: number;

  @ApiProperty({ example: 12, required: false, description: 'MAX_HOURS 모드: 최대 N시간' })
  @IsOptional()
  @IsInt()
  @Min(1)
  autoClockOutMaxHours?: number;

  // 야간 수당 설정
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  nightShiftEnabled?: boolean;

  @ApiProperty({ example: 1.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nightShiftMultiplier?: number;

  // 초과근무 수당 설정
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  overtimeEnabled?: boolean;

  @ApiProperty({ example: 1.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeMultiplier?: number;
}
