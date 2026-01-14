/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  // Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LeaveService } from './leave.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly svc: LeaveService) {}

  // ---------------------------------------------------------------------------
  // 🧭 EMPLOYEE — Get leave policies
  // ---------------------------------------------------------------------------
  @Get('policies')
  async getPolicies() {
    return this.svc.getPolicies();
  }

  // ---------------------------------------------------------------------------
  // 🧾 EMPLOYEE — Get my leave balances
  // ---------------------------------------------------------------------------
  @Get('balances/me')
  async getMyBalances(@Req() req: any) {
    return this.svc.getMyBalances(req.user.sub);
  }

  // ---------------------------------------------------------------------------
  // 📄 EMPLOYEE — Get my leave requests
  // ---------------------------------------------------------------------------
  @Get('my-requests')
  async getMyRequests(@Req() req: any) {
    return this.svc.getMyRequests(req.user.sub);
  }

  // ---------------------------------------------------------------------------
  // 📝 EMPLOYEE — Request leave
  // ---------------------------------------------------------------------------
  @Post('request')
  async createLeaveRequest(@Req() req: any, @Body() body: any) {
    return this.svc.createLeaveRequest(req.user.sub, body);
  }

  // ---------------------------------------------------------------------------
  // ❌ EMPLOYEE — Cancel leave
  // ---------------------------------------------------------------------------
  @Put('request/:id/cancel')
  async cancelLeave(@Req() req: any, @Param('id') id: string) {
    return this.svc.cancelLeave(req.user.sub, id);
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR/MD/CAO — Create new leave policy
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Post('policy')
  async createPolicy(@Body() dto: any) {
    return this.svc.createPolicy(dto);
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR/MD/CAO — Assign leave balances
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Post('assign')
  async assignLeave(@Req() req: any, @Body() dto: any) {
    const userRole = req.user.role;
    return this.svc.setEmployeeLeaveBalance(dto, userRole);
  }

  // ---------------------------------------------------------------------------
  // 🕓 ADMIN/HR/MD/CAO — Undo last batch assignment
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Post('assign/:batchId/undo')
  async undoAssignment(@Param('batchId') batchId: string) {
    return this.svc.undoLastAssignment(batchId);
  }

  // ---------------------------------------------------------------------------
  // ♻️ ADMIN/HR/MD/CAO — Trigger carry-forward manually
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Post('carry-forward')
  async triggerCarryForward() {
    return this.svc.carryForwardLeaves();
  }

  // ---------------------------------------------------------------------------
  // 📊 ADMIN/HR/MD/CAO — Get all leave requests
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Get('all')
  async getAllLeaveRequests(@Req() req: any) {
    return this.svc.getAllLeaveRequests(req.user);
  }

  // ---------------------------------------------------------------------------
  // 📅 ADMIN/HR/MD/CAO — Get all leave balances
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Get('balances/all')
  async getAllBalances(@Req() req: any) {
    return this.svc.getAllBalances(req.user);
  }

  // ---------------------------------------------------------------------------
  // ✅ ADMIN/HR/MD/CAO — Approve leave
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Put(':id/approve')
  async approveLeave(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.svc.approveLeave(req.user.sub, id, body.approverId);
  }

  // ---------------------------------------------------------------------------
  // ❌ ADMIN/HR/MD/CAO — Reject leave
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR', 'MD', 'CAO')
  @Put(':id/reject')
  async rejectLeave(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.svc.rejectLeave(req.user.sub, id, body.approverId);
  }
}
