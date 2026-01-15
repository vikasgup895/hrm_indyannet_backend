import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { ConvenienceChargeService } from './convenience-charge.service';
import { ConvenienceChargeController } from './convenience-charge.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [InsuranceController, ConvenienceChargeController],
  providers: [InsuranceService, ConvenienceChargeService, PrismaService],
})
export class InsuranceModule {}
