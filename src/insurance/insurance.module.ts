import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InsuranceController],
  providers: [InsuranceService, PrismaService],
})
export class InsuranceModule {}
