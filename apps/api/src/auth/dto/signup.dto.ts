import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'password123!' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;

  @ApiProperty({ example: '010-1234-5678', required: false })
  @IsOptional()
  @Matches(/^010-\d{4}-\d{4}$/, { message: '올바른 휴대폰 번호 형식이 아닙니다.' })
  phone?: string;
}
