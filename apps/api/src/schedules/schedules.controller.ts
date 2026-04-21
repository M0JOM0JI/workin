import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('스케줄')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores/:storeId/schedules')
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: '스케줄 목록 조회 (날짜 범위)' })
  findAll(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedulesService.findAll(storeId, userId, from, to);
  }

  @Post()
  @ApiOperation({ summary: '스케줄 생성 (오너/매니저)' })
  create(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(storeId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '스케줄 수정 (오너/매니저)' })
  update(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(storeId, id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '스케줄 삭제 (오너/매니저)' })
  remove(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.schedulesService.remove(storeId, id, userId);
  }
}
