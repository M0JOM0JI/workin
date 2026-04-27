import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StatisticsService } from './statistics.service';

@ApiTags('통계')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('stores/:storeId/statistics/staffs')
  @ApiOperation({ summary: '직원별 월간 통계 (지각·결근·근무시간)' })
  getStaffsStatistics(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.statisticsService.getStaffsStatistics(storeId, userId, yearMonth);
  }

  @Get('statistics/summary')
  @ApiOperation({ summary: '오너 전용 — 전 매장 출근 현황·통계 요약' })
  getStoreSummary(
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.statisticsService.getStoreSummary(userId, yearMonth);
  }
}
