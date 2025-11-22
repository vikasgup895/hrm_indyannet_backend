import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConvenienceChargeDto } from './dto/create-convenience-charge.dto';
import { UpdateConvenienceChargeDto } from './dto/update-convenience-charge.dto';

@Injectable()
export class ConvenienceChargeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConvenienceChargeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    // Convert date string to DateTime
    const dateTime = new Date(dto.date);
    
    return this.prisma.convenienceCharge.create({ 
      data: {
        ...dto,
        date: dateTime,
      }
    });
  }

  async findByEmployeeId(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.convenienceCharge.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const charge = await this.prisma.convenienceCharge.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!charge) throw new NotFoundException('Convenience charge not found');
    return charge;
  }

  async update(id: string, dto: UpdateConvenienceChargeDto) {
    const exists = await this.prisma.convenienceCharge.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Convenience charge not found');
    
    // Convert date string to DateTime if provided
    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(dto.date);
    }
    
    return this.prisma.convenienceCharge.update({ where: { id }, data });
  }

  async remove(id: string) {
    const exists = await this.prisma.convenienceCharge.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Convenience charge not found');
    return this.prisma.convenienceCharge.delete({ where: { id } });
  }
}