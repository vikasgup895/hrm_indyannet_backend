import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  getDefaultPayDateForMonth,
  getDefaultPayDateForPeriodDate,
} from './date.util';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  // ────────────────
  // ✅ Helper: Check if should hide MD/CAO employees
  // ────────────────
  private shouldHideMDCAO(user: AuthenticatedUser): boolean {
    return user.role !== 'MD' && user.role !== 'CAO';
  }

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
  async startRun(
    periodStart: string,
    periodEnd: string,
    payDate: string,
    user: AuthenticatedUser,
  ) {
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
  async getRuns(user: AuthenticatedUser) {
    return this.prisma.payrollRun.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔍 Get single payroll run by ID
  async getRun(id: string, user: AuthenticatedUser) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
    });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);
    return run;
  }

  // ✏️ Update payroll run (e.g., change payDate)
  async updateRun(
    id: string,
    data: { payDate?: string },
    user: AuthenticatedUser,
  ) {
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

    // 📝 Log payslip creation
    await this.auditLog.logPayslipCreate(
      payslip.id,
      {
        employeeId: payslip.employeeId,
        gross: payslip.gross,
        net: payslip.net,
        deductions: payslip.deductions,
        status: payslip.status,
      },
      _user?.sub,
      _user?.role,
    );

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
  async publish(runId: string, user: AuthenticatedUser) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new BadRequestException(`Payroll run ${runId} not found`);

    // Get all employees
    const employees = await this.prisma.employee.findMany({
      include: { compensation: true },
    });

    for (const e of employees) {
      const gross = Number(e.compensation?.baseSalary ?? 0);
      const net = gross;
      const currency = e.compensation?.currency ?? 'INR';

      const payslip = await this.prisma.payslip.create({
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

      // 📝 Log each payslip creation during publish
      await this.auditLog.logPayslipCreate(
        payslip.id,
        {
          employeeId: payslip.employeeId,
          gross: payslip.gross,
          net: payslip.net,
          deductions: payslip.deductions,
          status: payslip.status,
        },
        user?.sub,
        user?.role,
      );
    }

    // Update payroll run status to PAID after generating all payslips
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'PAID' },
    });
  }

  // 📜 Get all payslips (Admin / HR / Manager / MD / CAO)
  async getPayslips(user: AuthenticatedUser) {
    // If user is not MD/CAO, hide MD/CAO payslips
    const where = this.shouldHideMDCAO(user)
      ? ({ employee: { user: { role: { notIn: ['MD', 'CAO'] } } } } as any)
      : undefined;

    const payslips = await this.prisma.payslip.findMany({
      where,
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
  async getPayslip(id: string, user: AuthenticatedUser) {
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

    // If user is not MD/CAO and payslip is for MD/CAO, forbid access
    if (this.shouldHideMDCAO(user) && payslip.employee.user?.role && ['MD', 'CAO'].includes(payslip.employee.user.role)) {
      throw new ForbiddenException('Not authorized to view this payslip');
    }

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

  // 🗑️ Delete a payroll run
  async deleteRun(id: string, user: AuthenticatedUser) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { payslips: true },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    // Check if the run has associated payslips
    if (run.payslips && run.payslips.length > 0) {
      throw new BadRequestException(
        'Cannot delete payroll run with associated payslips. Delete payslips first.',
      );
    }

    await this.prisma.payrollRun.delete({
      where: { id },
    });

    return { message: 'Payroll run deleted successfully', id };
  }

  // 🗑️ Delete a payslip
  async deletePayslip(id: string, user: AuthenticatedUser) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    // Store the data before deletion for logging
    const payslipData = {
      id: payslip.id,
      employeeId: payslip.employeeId,
      gross: payslip.gross,
      net: payslip.net,
      deductions: payslip.deductions,
      status: payslip.status,
    };

    await this.prisma.payslip.delete({
      where: { id },
    });

    // 📝 Log payslip deletion
    await this.auditLog.logPayslipDelete(
      id,
      payslipData,
      user?.sub,
      user?.role,
    );

    return { message: 'Payslip deleted successfully', id };
  }
}
