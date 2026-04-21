import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      // Redis 연결 실패 시 경고만 출력 (앱은 계속 실행)
      this.logger.warn(`Redis 연결 오류: ${err.message}`);
    });

    this.client.connect().catch(() => {
      this.logger.warn('Redis에 연결할 수 없습니다. 초대 코드 기능이 제한됩니다.');
    });
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  get isConnected(): boolean {
    return this.client?.status === 'ready';
  }
}
