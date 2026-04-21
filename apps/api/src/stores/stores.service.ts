import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

const INVITE_TTL = 60 * 60 * 24; // 24시간

@Injectable()
export class StoresService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAllByUser(userId: string) {
    return this.prisma.storeStaff.findMany({
      where: { userId, leftAt: null },
      include: { store: true },
    });
  }

  async create(userId: string, dto: CreateStoreDto) {
    const store = await this.prisma.store.create({
      data: { ...dto, ownerId: userId },
    });
    // 오너를 OWNER 역할로 자동 등록
    await this.prisma.storeStaff.create({
      data: { storeId: store.id, userId, role: Role.OWNER, hourlyWage: 0 },
    });
    return store;
  }

  async findOne(storeId: string, userId: string) {
    await this.assertMember(storeId, userId);
    return this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  }

  async update(storeId: string, userId: string, dto: UpdateStoreDto) {
    await this.assertRole(storeId, userId, [Role.OWNER]);
    return this.prisma.store.update({ where: { id: storeId }, data: dto });
  }

  async findStaffs(storeId: string, userId: string) {
    await this.assertMember(storeId, userId);
    return this.prisma.storeStaff.findMany({
      where: { storeId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async remove(storeId: string, userId: string) {
    await this.assertRole(storeId, userId, [Role.OWNER]);
    await this.prisma.store.delete({ where: { id: storeId } });
    return { message: '매장이 삭제되었습니다.' };
  }

  async generateInviteCode(storeId: string, userId: string, role: string) {
    const staff = await this.assertRole(storeId, userId, [Role.OWNER, Role.MANAGER]);
    // 매니저는 STAFF 역할만 초대 가능
    if (staff.role === Role.MANAGER && role === 'MANAGER') {
      throw new ForbiddenException('매니저 초대는 오너만 가능합니다.');
    }
    if (!Object.values(Role).includes(role as Role)) {
      throw new BadRequestException('유효하지 않은 역할입니다.');
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const payload = JSON.stringify({ storeId, role });
    await this.redis.set(`invite:${code}`, payload, INVITE_TTL);

    return { code, expiresIn: '24h', role };
  }

  async joinByCode(userId: string, code: string) {
    const raw = await this.redis.get(`invite:${code}`);
    if (!raw) throw new BadRequestException('유효하지 않거나 만료된 초대 코드입니다.');

    const { storeId, role } = JSON.parse(raw) as { storeId: string; role: Role };

    // 이미 가입된 멤버 여부 확인
    const existing = await this.prisma.storeStaff.findFirst({
      where: { storeId, userId, leftAt: null },
    });
    if (existing) throw new BadRequestException('이미 해당 매장의 멤버입니다.');

    const member = await this.prisma.storeStaff.create({
      data: { storeId, userId, role },
      include: { store: true },
    });

    // 코드 즉시 삭제 (1회용)
    await this.redis.del(`invite:${code}`);

    return member;
  }

  // 매장 멤버 검증
  async assertMember(storeId: string, userId: string) {
    const staff = await this.prisma.storeStaff.findFirst({
      where: { storeId, userId, leftAt: null },
    });
    if (!staff) throw new ForbiddenException('해당 매장의 구성원이 아닙니다.');
    return staff;
  }

  // 역할 검증
  async assertRole(storeId: string, userId: string, roles: Role[]) {
    const staff = await this.assertMember(storeId, userId);
    if (!roles.includes(staff.role)) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return staff;
  }
}
