import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateAttendanceRequestDto } from './dto/create-attendance-request.dto';
import { ReviewAttendanceRequestDto } from './dto/review-attendance-request.dto';

@ApiTags('출퇴근')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('stores/:storeId/attendance')
  @ApiOperation({ summary: '매장 출퇴근 목록 조회 (오너/매니저)' })
  findAll(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.findAll(storeId, userId, date);
  }

  @Post('stores/:storeId/attendance/clock-in')
  @ApiOperation({ summary: '출근 체크' })
  clockIn(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Body('scheduleId') scheduleId?: string,
  ) {
    return this.attendanceService.clockIn(storeId, userId, scheduleId);
  }

  @Post('stores/:storeId/attendance/clock-out')
  @ApiOperation({ summary: '퇴근 체크' })
  clockOut(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attendanceService.clockOut(storeId, userId);
  }

  @Patch('stores/:storeId/attendance/:attendanceId')
  @ApiOperation({ summary: '출퇴근 시간 수동 수정 (오너/매니저)' })
  updateAttendance(
    @Param('storeId') storeId: string,
    @Param('attendanceId') attendanceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendance(storeId, userId, attendanceId, dto);
  }

  @Get('me/attendance')
  @ApiOperation({ summary: '내 출퇴근 이력' })
  myAttendance(
    @CurrentUser('id') userId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.attendanceService.findByUser(userId, yearMonth);
  }

  // ── AttendanceRequest ──────────────────────────────────────────────────────

  @Post('stores/:storeId/attendance-requests')
  @ApiOperation({ summary: '출퇴근 수정 요청 등록 (전 역할)' })
  createRequest(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAttendanceRequestDto,
  ) {
    return this.attendanceService.createRequest(storeId, userId, dto);
  }

  @Get('stores/:storeId/attendance-requests')
  @ApiOperation({ summary: '출퇴근 수정 요청 목록 (오너/매니저)' })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  findRequests(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: RequestStatus,
  ) {
    return this.attendanceService.findRequests(storeId, userId, status);
  }

  @Get('me/attendance-requests')
  @ApiOperation({ summary: '내 출퇴근 수정 요청 목록' })
  myRequests(@CurrentUser('id') userId: string) {
    return this.attendanceService.findMyRequests(userId);
  }

  @Patch('stores/:storeId/attendance-requests/:requestId/review')
  @ApiOperation({ summary: '출퇴근 수정 요청 승인/거절 (오너/매니저)' })
  reviewRequest(
    @Param('storeId') storeId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReviewAttendanceRequestDto,
  ) {
    return this.attendanceService.reviewRequest(storeId, userId, requestId, dto);
  }
}
