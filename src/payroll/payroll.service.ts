/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureCurrentPayrollRun();
  }

  private async ensureCurrentPayrollRun() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const payDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);

    const existing = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    if (existing) {
      // auto-update pay date if needed
      await this.prisma.payrollRun.update({
        where: { id: existing.id },
        data: { payDate },
      });
    } else {
      // create new run
      await this.prisma.payrollRun.create({
        data: { periodStart: start, periodEnd: end, payDate, status: 'DRAFT' },
      });
    }
  }

  // 🧾 Create a new payroll run
  async startRun(periodStart: string, periodEnd: string, payDate: string) {
    if (!periodStart || !periodEnd || !payDate) {
      throw new BadRequestException(
        'All fields (periodStart, periodEnd, payDate) are required.',
      );
    }

    return this.prisma.payrollRun.create({
      data: {
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        payDate: new Date(payDate),
        status: 'DRAFT',
      },
    });
  }

  // 📊 Get all payroll runs
  async getRuns() {
    return this.prisma.payrollRun.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // 👑 Admin manually generates a payslip for a single employee
  async generatePayslipForEmployee(dto: {
    employeeId: string;
    runId: string;
    gross: number;
    deductions?: number;
    net: number;
    currency?: string;
  }) {
    const {
      employeeId,
      runId,
      gross,
      deductions = 0,
      net,
      currency = 'INR',
    } = dto;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new BadRequestException('Employee not found');

    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new BadRequestException('Payroll run not found');

    const existing = await this.prisma.payslip.findFirst({
      where: { employeeId, payrollRunId: runId },
    });
    if (existing) {
      throw new BadRequestException(
        'Payslip already exists for this employee and run.',
      );
    }

    return this.prisma.payslip.create({
      data: {
        employeeId,
        payrollRunId: runId,
        gross,
        deductions,
        net,
        currency,
        lines: [
          { label: 'Base Salary', amount: gross },
          { label: 'Deductions', amount: deductions },
          { label: 'Net Pay', amount: net },
        ],
      },
      include: {
        employee: true,
        payrollRun: true,
      },
    });
  }

  // 🧮 Publish payroll run (auto-generate for all employees)
  async publish(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new BadRequestException(`Payroll run ${runId} not found`);

    const employees = await this.prisma.employee.findMany({
      include: { compensation: true },
    });

    for (const e of employees) {
      const gross = Number(e.compensation?.baseSalary ?? 0);
      const net = gross;
      const currency = e.compensation?.currency ?? 'INR';

      await this.prisma.payslip.create({
        data: {
          payrollRunId: runId,
          employeeId: e.id,
          gross,
          deductions: 0,
          net,
          currency,
          lines: [
            { label: 'Base Salary', amount: gross },
            { label: 'Net Pay', amount: net },
          ],
        },
      });
    }

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'APPROVED' },
    });
  }

  // 📜 Get all payslips (Admin / HR / Manager)
  async getPayslips() {
    return this.prisma.payslip.findMany({
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
        payrollRun: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔍 Get one payslip by ID
  async getPayslip(id: string) {
    return this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: true,
        payrollRun: true,
      },
    });
  }

  async getMyCurrentPayslip(userId: string) {
    // 1️⃣ Find the employee record linked to this user
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee record not found for this user');
    }

    // 2️⃣ Determine current date
    const now = new Date();

    // 3️⃣ Find payroll run that includes today's date
    const run = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!run) {
      throw new NotFoundException('No payroll run found for this month');
    }

    // 4️⃣ Find payslip for this employee within this run
    const payslip = await this.prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        payrollRunId: run.id,
      },
      include: {
        payrollRun: true,
        employee: true,
      },
    });

    if (!payslip) {
      throw new NotFoundException('No payslip found for this month');
    }

    return payslip;
  }

  // 👤 Employee: get only current month's payslip
  // async getMyCurrentPayslip(userId: string) {
  //   const employee = await this.prisma.employee.findFirst({
  //     where: { userId },
  //   });

  //   if (!employee) {
  //     throw new BadRequestException('Employee record not found for this user');
  //   }

  //   const now = new Date();
  //   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  //   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  //   return this.prisma.payslip.findFirst({
  //     where: {
  //       employeeId: employee.id,
  //       payrollRun: {
  //         periodStart: { gte: startOfMonth },
  //         periodEnd: { lte: endOfMonth },
  //       },
  //     },
  //     include: { payrollRun: true },
  //     orderBy: { createdAt: 'desc' },
  //   });
  // }
}
