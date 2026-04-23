import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: '스타벅스 강남점' })
  @IsString()
  name: string;

  @ApiProperty({ example: '홍길동', required: false })
  @IsOptional()
  @IsString()
  businessOwner?: string;

  @ApiProperty({ example: '123-45-67890', required: false })
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiProperty({ example: '서울 강남구 테헤란로 1길', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '02-1234-5678', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '010-1234-5678', required: false })
  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @ApiProperty({ example: '카페', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
