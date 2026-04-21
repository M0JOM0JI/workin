import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private storesService: StoresService,
  ) {}

  async findAll(storeId: string, userId: string, from: string, to: string) {
    await this.storesService.assertMember(storeId, userId);
    return this.prisma.schedule.findMany({
      where: {
        storeId,
        startAt: { gte: new Date(from) },
        endAt: { lte: new Date(to) },
      },
      include: { staff: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(storeId: string, userId: string, dto: CreateScheduleDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.schedule.create({
      data: { storeId, ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) },
    });
  }

  async update(storeId: string, id: string, userId: string, dto: UpdateScheduleDto) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt && { endAt: new Date(dto.endAt) }),
      },
    });
  }

  async remove(storeId: string, id: string, userId: string) {
    await this.storesService.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: '스케줄이 삭제되었습니다.' };
  }
}
