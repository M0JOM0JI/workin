import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';

@ApiTags('출퇴근')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // 매장 전체 출퇴근 조회 (오너/매니저)
  @Get('stores/:storeId/attendance')
  @ApiOperation({ summary: '매장 출퇴근 목록 조회' })
  findAll(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.findAll(storeId, userId, date);
  }

  // 출근 (알바생)
  @Post('stores/:storeId/attendance/clock-in')
  @ApiOperation({ summary: '출근 체크' })
  clockIn(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Body('scheduleId') scheduleId?: string,
  ) {
    return this.attendanceService.clockIn(storeId, userId, scheduleId);
  }

  // 퇴근 (알바생)
  @Post('stores/:storeId/attendance/clock-out')
  @ApiOperation({ summary: '퇴근 체크' })
  clockOut(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.clockOut(storeId, userId);
  }

  // 내 출퇴근 이력 (알바생)
  @Get('me/attendance')
  @ApiOperation({ summary: '내 출퇴근 이력' })
  myAttendance(
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.attendanceService.findByUser(userId, yearMonth);
  }
}
