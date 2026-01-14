/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
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
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Post('runs')
  createRun(
    @Body() body: { periodStart: string; periodEnd: string; payDate: string },
    @Req() req: any,
  ) {
    return this.svc.startRun(body.periodStart, body.periodEnd, body.payDate, req.user);
  }

  // 👑 Admin manually generates payslip for one employee
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Post('generate')
  async generatePayslip(@Body() body: any, @Req() req: any) {
    return this.svc.generatePayslipForEmployee(body, req.user);
  }

  // 📤 Publish payroll run — auto-generate payslips for all employees
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Post('runs/:id/publish')
  publish(@Param('id') id: string, @Req() req: any) {
    return this.svc.publish(id, req.user);
  }

  // 📊 View all payroll runs
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('runs')
  getRuns(@Req() req: any) {
    return this.svc.getRuns(req.user);
  }

  // 🔍 Get single payroll run by ID
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('runs/:id')
  getRun(@Param('id') id: string, @Req() req: any) {
    return this.svc.getRun(id, req.user);
  }

  // ✏️ Update payroll run (e.g., change payDate)
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Patch('runs/:id')
  updateRun(@Param('id') id: string, @Body() body: { payDate?: string }, @Req() req: any) {
    return this.svc.updateRun(id, body, req.user);
  }

  // 📜 View all payslips (Admin / HR / Manager / MD / CAO)
  @Roles('HR', 'ADMIN', 'MANAGER', 'MD', 'CAO')
  @Get('payslips')
  getPayslips(@Req() req: any) {
    return this.svc.getPayslips(req.user);
  }

  //  Shared route: view one payslip by ID
  @Roles('HR', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'MD', 'CAO')
  @Get('payslips/:id')
  getPayslip(@Param('id') id: string, @Req() req: any) {
    return this.svc.getPayslip(id, req.user);
  }

  // test
  // 👤 Employee: view only current month’s payslip
  @Roles('EMPLOYEE', 'HR', 'ADMIN', 'MANAGER', 'MD', 'CAO')
  @Get('my-current')
  getMyCurrentPayslip(@Req() req) {
    return this.svc.getMyCurrentPayslip(req.user.sub);
  }

  // 👤 Employee: view ALL payslips
  @Roles('EMPLOYEE', 'HR', 'ADMIN', 'MANAGER', 'MD', 'CAO')
  @Get('my')
  getMyPayslips(@Req() req) {
    return this.svc.getMyPayslips(req.user.sub);
  }

  // 🗑️ Delete payroll run (Admin / HR / MD / CAO only)
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Delete('runs/:id')
  deleteRun(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteRun(id, req.user);
  }

  // 🗑️ Delete payslip (Admin / HR / MD / CAO only)
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Delete('payslips/:id')
  deletePayslip(@Param('id') id: string, @Req() req: any) {
    return this.svc.deletePayslip(id, req.user);
  }
}
