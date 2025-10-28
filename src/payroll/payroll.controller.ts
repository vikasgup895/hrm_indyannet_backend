/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PayrollService } from './payroll.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private svc: PayrollService) {}

  // 🧾 Create a new payroll run
  @Roles('HR', 'ADMIN')
  @Post('runs')
  createRun(
    @Body() body: { periodStart: string; periodEnd: string; payDate: string },
  ) {
    return this.svc.startRun(body.periodStart, body.periodEnd, body.payDate);
  }

  // 👑 Admin manually generates payslip for one employee
  @Roles('HR', 'ADMIN')
  @Post('generate')
  generatePayslip(
    @Body()
    body: {
      employeeId: string;
      runId: string;
      gross: number;
      deductions?: number;
      net: number;
      currency?: string;
    },
  ) {
    return this.svc.generatePayslipForEmployee(body);
  }

  // 📤 Publish payroll run — auto-generate payslips for all employees
  @Roles('HR', 'ADMIN')
  @Post('runs/:id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publish(id);
  }

  // 📊 View all payroll runs
  @Roles('HR', 'ADMIN')
  @Get('runs')
  getRuns() {
    return this.svc.getRuns();
  }

  // 📜 View all payslips (Admin / HR / Manager)
  @Roles('HR', 'ADMIN', 'MANAGER')
  @Get('payslips')
  getPayslips() {
    return this.svc.getPayslips();
  }

  // 👤 Employee: view only current month’s payslip
  // @Roles('EMPLOYEE', 'HR', 'ADMIN', 'MANAGER')
  // @Get('my-current')
  // getMyCurrentPayslip(@Req() req) {
  //   return this.svc.getMyCurrentPayslip(req.user.sub);
  // }

  // 🔍 Shared route: view one payslip by ID
  @Roles('HR', 'ADMIN', 'MANAGER', 'EMPLOYEE')
  @Get('payslips/:id')
  getPayslip(@Param('id') id: string) {
    return this.svc.getPayslip(id);
  }

  // test
  // 👤 Employee: view only current month’s payslip
  @Roles('EMPLOYEE', 'HR', 'ADMIN', 'MANAGER')
  @Get('my-current')
  getMyCurrentPayslip(@Req() req) {
    return this.svc.getMyCurrentPayslip(req.user.sub);
  }
}
