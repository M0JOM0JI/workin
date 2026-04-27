import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';

@ApiTags('급여')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('stores/:storeId/payroll')
  @ApiOperation({ summary: '매장 월별 급여 요약 (야간·초과·주휴수당 포함)' })
  async findAll(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const ym = yearMonth ?? `${year}-${String(month).padStart(2, '0')}`;
    return this.payrollService.getStoreSummary(storeId, userId, ym);
  }

  @Get('stores/:storeId/payroll/:staffId')
  @ApiOperation({ summary: '알바생별 급여 명세 (상세 breakdown)' })
  findOne(
    @Param('storeId') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.payrollService.getStaffPayroll(storeId, staffId, userId, yearMonth);
  }

  @Post('stores/:storeId/payroll/:staffId/confirm')
  @ApiOperation({ summary: '급여 확정 (오너/매니저) — Payroll 레코드에 저장' })
  confirmPayroll(
    @Param('storeId') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.payrollService.confirmPayroll(storeId, staffId, userId, yearMonth);
  }

  @Get('me/payroll')
  @ApiOperation({ summary: '내 급여 확인 (알바생)' })
  myPayroll(
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.payrollService.getMyPayroll(userId, yearMonth);
  }
}
