import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  getDefaultPayDateForMonth,
  getDefaultPayDateForPeriodDate,
} from './date.util';

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
    // Payment date by policy (10th of next month)
    const payDate = getDefaultPayDateForPeriodDate(now);

    const existing = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    if (existing) {
      await this.prisma.payrollRun.update({
        where: { id: existing.id },
        data: { payDate },
      });
    } else {
      await this.prisma.payrollRun.create({
        data: { periodStart: start, periodEnd: end, payDate, status: 'DRAFT' },
      });
    }
  }

  // 🔧 Auto-create payroll run if it doesn't exist for a given month
  // Payment date is automatically set to the 10th of next month
  private async ensurePayrollRunForMonth(
    year: number,
    month: number,
  ): Promise<any> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    // Payment date by policy (10th of next month)
    const payDate = getDefaultPayDateForMonth(year, month);

    const existing = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: { lte: start },
        periodEnd: { gte: start },
      },
    });

    if (existing) {
      return existing;
    }

    // Auto-create new payroll run for the month with DRAFT status
    return await this.prisma.payrollRun.create({
      data: {
        periodStart: start,
        periodEnd: end,
        payDate,
        status: 'DRAFT',
      },
    });
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

  // 🔍 Get single payroll run by ID
  async getRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
    });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);
    return run;
  }

  // ✏️ Update payroll run (e.g., change payDate)
  async updateRun(id: string, data: { payDate?: string }) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
    });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);

    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        ...(data.payDate && { payDate: new Date(data.payDate) }),
      },
    });
  }

  // 👑 Admin manually generates a payslip for a single employee
  async generatePayslipForEmployee(
    dto: {
      employeeId: string;
      runId: string;
      gross: number;
      deductions?: number;
      net: number;
      currency?: string;
      basic?: number;
      hra?: number;
      conveyance?: number;
      medical?: number;
      bonus?: number;
      other?: number;
      // Replaced EPF with Leave Deduction input
      leaveDeduction?: number;
      professionalTax?: number;
      otherDeduction?: number;
    },
    _user: any,
  ) {
    const {
      employeeId,
      runId,
      gross,
      deductions = 0,
      net,
      currency = 'INR',
      basic = 0,
      hra = 0,
      conveyance = 0,
      medical = 0,
      bonus = 0,
      other = 0,
      leaveDeduction = 0,
      professionalTax = 0,
      otherDeduction = 0,
    } = dto;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        bankDetail: true,
        user: true,
        compensation: true,
      },
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

    // 🧾 Construct payslip lines
    const lines = [
      { label: 'Basic Salary', amount: basic },
      { label: 'HRA', amount: hra },
      { label: 'Conveyance', amount: conveyance },
      { label: 'Medical', amount: medical },
      { label: 'Bonus', amount: bonus },
      { label: 'Other Earnings', amount: other },
      { label: 'Leave Deduction', amount: -leaveDeduction },
      { label: 'Professional Tax', amount: -professionalTax },
      { label: 'Other Deductions', amount: -otherDeduction },
      { label: 'Gross', amount: gross },
      { label: 'Total Deductions', amount: -deductions },
      { label: 'Net Pay', amount: net },
    ];

    // 🧱 Save to DB
    const payslip = await this.prisma.payslip.create({
      data: {
        employeeId,
        payrollRunId: runId,
        gross,
        deductions,
        net,
        currency,
        lines,
        basic,
        hra,
        conveyance,
        medical,
        bonus,
        otherEarnings: other,
        // Persist leave deduction explicitly in the model for reporting/queries
        leaveDeduction,
        epf: 0,
        professionalTax,
        otherDeductions: otherDeduction,
        status: 'APPROVED',
      },
      include: {
        employee: {
          include: {
            bankDetail: true,
            user: true,
            compensation: true,
          },
        },
        payrollRun: true,
      },
    });

    // Update payroll run status to PAID when first payslip is created
    if (run && run.status === 'DRAFT') {
      await this.prisma.payrollRun.update({
        where: { id: runId },
        data: { status: 'PAID' },
      });
    }

    //console.log("🧾 Payslip Generated:", JSON.stringify(payslip, null, 2));
    return payslip;
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

    // Update payroll run status to PAID after generating all payslips
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'PAID' },
    });
  }

  // 📜 Get all payslips (Admin / HR / Manager)
  async getPayslips() {
    const payslips = await this.prisma.payslip.findMany({
      include: {
        employee: {
          include: {
            user: true,
            bankDetail: true,
            compensation: true,
          },
        },
        payrollRun: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // console.log("✅ getPayslips() count:", payslips.length);
    if (payslips.length) {
      // console.log(
      //   "🧾 Sample Payslip:",
      //   JSON.stringify(payslips[0], null, 2)
      // );
    }

    return payslips;
  }

  // 🔍 Get one payslip by ID
  async getPayslip(id: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            bankDetail: true,
            compensation: true,
          },
        },
        payrollRun: true,
      },
    });

    if (!payslip) throw new NotFoundException(`Payslip ${id} not found`);
    // console.log("🧾 Single Payslip Debug:", JSON.stringify(payslip, null, 2));
    return payslip;
  }

  // 👤 Get current user’s payslip
  async getMyCurrentPayslip(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        bankDetail: true,
        user: true,
        compensation: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee record not found for this user');
    }

    const now = new Date();
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

    const payslip = await this.prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        payrollRunId: run.id,
      },
      include: {
        payrollRun: true,
        employee: {
          include: {
            bankDetail: true,
            user: true,
            compensation: true,
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('No payslip found for this month');
    }

    // console.log("🧾 My Current Payslip:", JSON.stringify(payslip, null, 2));
    return payslip;
  }

  // 👤 Get ALL payslips for current user
  async getMyPayslips(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee record not found for this user');
    }

    const payslips = await this.prisma.payslip.findMany({
      where: { employeeId: employee.id },
      include: {
        payrollRun: true,
        employee: {
          include: {
            bankDetail: true,
            user: true,
            compensation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payslips;
  }
}
