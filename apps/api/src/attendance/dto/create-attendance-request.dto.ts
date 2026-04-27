import { IsDateString, IsOptional, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceRequestDto {
  @ApiProperty({ example: 'clxxx...', required: false, nullable: true, description: '수정할 출퇴근 ID (null이면 신규 등록 요청)' })
  @IsOptional()
  @IsString()
  attendanceId?: string | null;

  @ApiProperty({ example: '2026-04-27T09:00:00.000Z', description: '요청 출근 시간 (UTC)' })
  @IsNotEmpty()
  @IsDateString()
  requestedClockIn!: string;

  @ApiProperty({ example: '2026-04-27T18:00:00.000Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  requestedClockOut?: string | null;

  @ApiProperty({ example: '퇴근 버튼을 누르지 못했습니다.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  reason!: string;

  @ApiProperty({ example: 'clstaff...', required: false, description: '대상 직원 StoreStaff.id (오너/매니저가 직원 대신 등록 시)' })
  @IsOptional()
  @IsString()
  staffId?: string;
}
