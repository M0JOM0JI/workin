import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Role } from '@prisma/client';

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

  @Patch(':id/staffs/:staffId')
  @ApiOperation({ summary: '직원 시급·퇴직 처리 (오너/매니저)' })
  updateStaff(
    @Param('id') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.storesService.updateStaff(storeId, userId, staffId, dto);
  }

  @Patch(':id/staffs/:staffId/role')
  @ApiOperation({ summary: '직원 역할 변경 (오너 전용)' })
  @ApiBody({ schema: { properties: { role: { type: 'string', enum: ['MANAGER', 'STAFF'] } } } })
  updateStaffRole(
    @Param('id') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
    @Body('role') role: Role,
  ) {
    return this.storesService.updateStaffRole(storeId, userId, staffId, role);
  }

  @Post(':id/staffs/:staffId/rehire')
  @ApiOperation({ summary: '퇴직 직원 재고용 (오너/매니저)' })
  rehireStaff(
    @Param('id') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.rehireStaff(storeId, userId, staffId);
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
