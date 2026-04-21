import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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

  // 매장 월별 급여 요약 (오너/매니저)
  // ?yearMonth=2026-04  또는  ?year=2026&month=4 모두 지원
  @Get('stores/:storeId/payroll')
  @ApiOperation({ summary: '매장 월별 급여 요약' })
  async findAll(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const ym = yearMonth ?? `${year}-${String(month).padStart(2, '0')}`;
    const items = await this.payrollService.getStoreSummary(storeId, userId, ym);
    const [y, m] = ym.split('-').map(Number);
    return {
      year: y,
      month: m,
      staffCount: items.length,
      totalBasePay: items.reduce((s, i) => s + i.basePay, 0),
      totalDeduction: items.reduce((s, i) => s + i.deduction, 0),
      totalNetPay: items.reduce((s, i) => s + i.netPay, 0),
      items,
    };
  }

  // 알바생별 급여 명세 (오너/매니저)
  @Get('stores/:storeId/payroll/:staffId')
  @ApiOperation({ summary: '알바생별 급여 명세' })
  findOne(
    @Param('storeId') storeId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.payrollService.getStaffPayroll(storeId, staffId, userId, yearMonth);
  }

  // 내 급여 확인 (알바생)
  @Get('me/payroll')
  @ApiOperation({ summary: '내 급여 확인' })
  myPayroll(
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.payrollService.getMyPayroll(userId, yearMonth);
  }
}
