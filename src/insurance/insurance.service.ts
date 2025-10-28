/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { UpdateFinancialDto } from './dto/update-financial.dto';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInsuranceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.insurance.create({ data: dto });
  }

  async findAll(role?: string, employeeId?: string) {
    if (role === 'EMPLOYEE' && employeeId) {
      // Only return the logged-in employee's insurance records
      return this.prisma.insurance.findMany({
        where: { employeeId },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: true,
              workEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Default: admin or HR gets everything
    return this.prisma.insurance.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            workEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const insurance = await this.prisma.insurance.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!insurance) throw new NotFoundException('Insurance record not found');
    return insurance;
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    return this.prisma.insurance.update({ where: { id }, data: dto });
  }

  async updateFinancial(id: string, dto: UpdateFinancialDto) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    return this.prisma.insurance.update({
      where: { id },
      data: {
        bonusPercent: dto.bonusPercent,
        eCashAmount: dto.eCashAmount,
        convenienceFee: dto.convenienceFee,
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    return this.prisma.insurance.delete({ where: { id } });
  }
}
