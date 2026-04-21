import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@ApiTags('매장')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: '내 매장 목록' })
  findAll(@CurrentUser('id') userId: string) {
    return this.storesService.findAllByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: '매장 생성 (오너 전용)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateStoreDto) {
    return this.storesService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '매장 상세' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.storesService.findOne(id, userId);
  }

  @Get(':id/staffs')
  @ApiOperation({ summary: '매장 직원 목록' })
  findStaffs(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.storesService.findStaffs(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '매장 정보 수정 (오너 전용)' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매장 삭제 (오너 전용)' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.storesService.remove(id, userId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: '초대 코드 발급' })
  invite(@Param('id') storeId: string, @CurrentUser('id') userId: string, @Body('role') role: string) {
    return this.storesService.generateInviteCode(storeId, userId, role);
  }

  @Post('join')
  @ApiOperation({ summary: '초대 코드로 매장 합류' })
  join(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.storesService.joinByCode(userId, code);
  }
}
