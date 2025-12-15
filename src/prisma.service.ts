import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // insurance: any;
  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication): void {
    (this.$on as (event: string, cb: () => void) => void)('beforeExit', () => {
      void app.close();
    });
  }
}
