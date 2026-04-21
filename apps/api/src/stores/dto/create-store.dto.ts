import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: '스타벅스 강남점' })
  @IsString()
  name: string;

  @ApiProperty({ example: '서울 강남구 테헤란로 1길', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '카페', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
