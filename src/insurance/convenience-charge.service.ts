import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConvenienceChargeDto } from './dto/create-convenience-charge.dto';
import { UpdateConvenienceChargeDto } from './dto/update-convenience-charge.dto';

@Injectable()
export class ConvenienceChargeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Employee creates a convenience charge (PENDING approval)
   */
  async createByEmployee(employeeId: string, dto: CreateConvenienceChargeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.convenienceCharge.create({
      data: {
        ...dto,
        employeeId,
        date: new Date(dto.date),
        status: 'PENDING', // ← Important: Start in PENDING state
      },
    });
  }

  /**
   * Get all charges for an employee (filtered by role)
   */
  async findByEmployeeId(
    employeeId: string,
    role: string,
    requesterEmployeeId?: string,
  ) {
    // Employees can only see their own
    if (role === 'EMPLOYEE' && requesterEmployeeId !== employeeId) {
      throw new ForbiddenException('You can only access your own charges');
    }

    return this.prisma.convenienceCharge.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all PENDING charges (for HR/Admin to review)
   */
  async getPendingCharges() {
    return this.prisma.convenienceCharge.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });
  }

  /**
   * Get charges by status
   */
  async getChargesByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.convenienceCharge.findMany({
      where: { status },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Employee updates own charge (can only edit if PENDING or REJECTED)
   */
  async updateByEmployee(
    chargeId: string,
    employeeId: string,
    dto: UpdateConvenienceChargeDto,
  ) {
    const charge = await this.prisma.convenienceCharge.findUnique({
      where: { id: chargeId },
    });

    if (!charge) throw new NotFoundException('Charge not found');
    if (charge.employeeId !== employeeId) {
      throw new ForbiddenException('You can only edit your own charges');
    }

    // Can only edit if PENDING or REJECTED
    if (charge.status !== 'PENDING' && charge.status !== 'REJECTED') {
      throw new ForbiddenException(
        'Can only edit charges that are pending or rejected',
      );
    }

    return this.prisma.convenienceCharge.update({
      where: { id: chargeId },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  /**
   * HR/Admin approves or rejects a charge
   */
  async approveCharge(
    chargeId: string,
    approverId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const charge = await this.prisma.convenienceCharge.findUnique({
      where: { id: chargeId },
    });

    if (!charge) throw new NotFoundException('Charge not found');
    if (charge.status !== 'PENDING') {
      throw new ForbiddenException(
        'Only pending charges can be approved/rejected',
      );
    }

    return this.prisma.convenienceCharge.update({
      where: { id: chargeId },
      data: {
        status,
        approvedBy: approverId,
        approvalDate: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });
  }

  /**
   * Employee deletes own charge (can only delete if PENDING or REJECTED)
   */
  async removeByEmployee(chargeId: string, employeeId: string) {
    const charge = await this.prisma.convenienceCharge.findUnique({
      where: { id: chargeId },
    });

    if (!charge) throw new NotFoundException('Charge not found');
    if (charge.employeeId !== employeeId) {
      throw new ForbiddenException('You can only delete your own charges');
    }

    if (charge.status !== 'PENDING' && charge.status !== 'REJECTED') {
      throw new ForbiddenException(
        'Can only delete pending or rejected charges',
      );
    }

    return this.prisma.convenienceCharge.delete({ where: { id: chargeId } });
  }

  /**
   * Get APPROVED charges for an employee in a date range (for payroll)
   */
  async getApprovedChargesForPayroll(
    employeeId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.prisma.convenienceCharge.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        date: {
          gte: fromDate,
          lte: toDate,
        },
        payslipId: null, // Not yet added to any payslip
      },
    });
  }

  /**
   * Get a specific charge
   */
  async findOne(id: string) {
    const charge = await this.prisma.convenienceCharge.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!charge) throw new NotFoundException('Convenience charge not found');
    return charge;
  }

  /**
   * [DEPRECATED] Create by Admin/HR - use createByEmployee instead
   */
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
        status: 'PENDING',
      },
    });
  }

  /**
   * [DEPRECATED] Get by employee - use findByEmployeeId instead
   */
  async findByEmployeeIdLegacy(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.convenienceCharge.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Update charge (legacy)
   */
  async update(id: string, dto: UpdateConvenienceChargeDto) {
    const exists = await this.prisma.convenienceCharge.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Convenience charge not found');

    // Convert date string to DateTime if provided
    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(dto.date);
    }

    return this.prisma.convenienceCharge.update({ where: { id }, data });
  }

  /**
   * Remove (legacy)
   */
  async remove(id: string) {
    const exists = await this.prisma.convenienceCharge.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Convenience charge not found');
    return this.prisma.convenienceCharge.delete({ where: { id } });
  }

  /**
   * Bulk approve/reject charges
   * Format: { chargeId1: 'APPROVED', chargeId2: 'REJECTED', ... }
   */
  async bulkApproveCharges(
    approverId: string,
    chargeUpdates: Record<string, 'APPROVED' | 'REJECTED'>,
    rejectionReasons?: Record<string, string>,
  ) {
    const results: any[] = [];
    const errors: string[] = [];

    for (const [chargeId, status] of Object.entries(chargeUpdates)) {
      try {
        const charge = await this.prisma.convenienceCharge.findUnique({
          where: { id: chargeId },
        });

        if (!charge) {
          errors.push(`Charge ${chargeId} not found`);
          continue;
        }

        if (charge.status !== 'PENDING') {
          errors.push(
            `Charge ${chargeId} is not pending (current: ${charge.status})`,
          );
          continue;
        }

        const updated = await this.prisma.convenienceCharge.update({
          where: { id: chargeId },
          data: {
            status,
            approvedBy: approverId,
            approvalDate: new Date(),
            rejectionReason:
              status === 'REJECTED'
                ? rejectionReasons?.[chargeId] || null
                : null,
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                department: true,
              },
            },
          },
        });

        results.push(updated);
      } catch (err: any) {
        errors.push(`Error processing charge ${chargeId}: ${err.message}`);
      }
    }

    return {
      success: results,
      errors,
      summary: {
        total: Object.keys(chargeUpdates).length,
        processed: results.length,
        failed: errors.length,
      },
    };
  }

  /**
   * Bulk create charges by employee (multiple charges at once)
   * Input: Array of charges with title, amount, date
   */
  async bulkCreateByEmployee(
    employeeId: string,
    charges: Array<{ title: string; amount: number; date: string }>,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const created: any[] = [];
    const errors: string[] = [];

    for (const charge of charges) {
      try {
        if (!charge.title || !charge.amount) {
          errors.push('Each charge must have a title and amount');
          continue;
        }

        const created_charge = await this.prisma.convenienceCharge.create({
          data: {
            employeeId,
            title: charge.title,
            amount: parseFloat(charge.amount.toString()),
            date: new Date(charge.date),
            status: 'PENDING',
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        created.push(created_charge);
      } catch (err: any) {
        errors.push(`Error creating charge "${charge.title}": ${err.message}`);
      }
    }

    return {
      created,
      errors,
      summary: {
        total: charges.length,
        created: created.length,
        failed: errors.length,
      },
    };
  }
}
