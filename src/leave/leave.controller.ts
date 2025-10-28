// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import {
//   Body,
//   Controller,
//   Get,
//   Param,
//   Post,
//   Put,
//   UseGuards,
//   Req,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { Roles } from '../auth/roles.decorator';
// import { RolesGuard } from '../auth/roles.guard';
// import { LeaveService } from './leave.service';

// @UseGuards(AuthGuard('jwt'), RolesGuard)
// @Controller('leave')
// export class LeaveController {
//   constructor(private readonly svc: LeaveService) {}

//   // 🧭 GET /leave/policies
//   @Get('policies')
//   async getPolicies() {
//     return this.svc.getPolicies();
//   }

//   // 🧾 GET /leave/balances/me
//   @Get('balances/me')
//   async getMyBalances(@Req() req: any) {
//     return this.svc.getMyBalances(req.user.sub); // ✅ JWT stores user ID in `sub`
//   }

//   // 📄 GET /leave/my-requests
//   @Get('my-requests')
//   async getMyRequests(@Req() req: any) {
//     return this.svc.getMyRequests(req.user.sub);
//   }

//   // 📝 POST /leave/request
//   @Post('request')
//   async createLeaveRequest(@Req() req: any, @Body() body: any) {
//     return this.svc.createLeaveRequest(req.user.sub, body);
//   }

//   // ❌ PUT /leave/request/:id/cancel
//   @Put('request/:id/cancel')
//   async cancelLeave(@Req() req: any, @Param('id') id: string) {
//     return this.svc.cancelLeave(req.user.sub, id);
//   }

//   // 👑 ADMIN/HR — Assign or update leave balances for employees
//   @Roles('ADMIN', 'HR')
//   @Post('assign')
//   async assignLeave(@Req() req: any, @Body() dto: any) {
//     const userRole = req.user.role;
//     return this.svc.setEmployeeLeaveBalance(dto, userRole);
//   }

//   // 🕓 Optional — Allow undo (used for the Undo button in UI)
//   @Roles('ADMIN', 'HR')
//   @Post('assign/:batchId/undo')
//   async undoAssignment(@Param('batchId') batchId: string) {
//     return this.svc.undoLastAssignment(batchId);
//   }

//   // 👑 ADMIN/HR — Get all leave requests
//   @Roles('ADMIN', 'HR')
//   @Get('all')
//   async getAllLeaveRequests() {
//     return this.svc.getAllLeaveRequests();
//   }

//   // ✅ PUT /leave/:id/approve
//   @Roles('ADMIN', 'HR')
//   @Put(':id/approve')
//   async approveLeave(
//     @Param('id') id: string,
//     @Req() req: any,
//     @Body() body: any,
//   ) {
//     return this.svc.approveLeave(req.user.sub, id, body.approverId);
//   }

//   // ✅ PUT /leave/:id/reject
//   @Roles('ADMIN', 'HR')
//   @Put(':id/reject')
//   async rejectLeave(
//     @Param('id') id: string,
//     @Req() req: any,
//     @Body() body: any,
//   ) {
//     return this.svc.rejectLeave(req.user.sub, id, body.approverId);
//   }
// }

/* eslint-disable @typescript-eslint/require-await */
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
  // 👑 ADMIN/HR — Create new leave policy
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Post('policy')
  async createPolicy(@Body() dto: any) {
    return this.svc.createPolicy(dto);
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR — Assign leave balances
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Post('assign')
  async assignLeave(@Req() req: any, @Body() dto: any) {
    const userRole = req.user.role;
    return this.svc.setEmployeeLeaveBalance(dto, userRole);
  }

  // ---------------------------------------------------------------------------
  // 🕓 ADMIN/HR — Undo last batch assignment
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Post('assign/:batchId/undo')
  async undoAssignment(@Param('batchId') batchId: string) {
    return this.svc.undoLastAssignment(batchId);
  }

  // ---------------------------------------------------------------------------
  // ♻️ ADMIN/HR — Trigger carry-forward manually
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Post('carry-forward')
  async triggerCarryForward() {
    return this.svc.carryForwardLeaves();
  }

  // ---------------------------------------------------------------------------
  // 📊 ADMIN/HR — Get all leave requests
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Get('all')
  async getAllLeaveRequests() {
    return this.svc.getAllLeaveRequests();
  }

  // ---------------------------------------------------------------------------
  // 📅 ADMIN/HR — Get all leave balances
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Get('balances/all')
  async getAllBalances() {
    return this.svc.getAllBalances();
  }

  // ---------------------------------------------------------------------------
  // ✅ ADMIN/HR — Approve leave
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Put(':id/approve')
  async approveLeave(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.svc.approveLeave(req.user.sub, id, body.approverId);
  }

  // ---------------------------------------------------------------------------
  // ❌ ADMIN/HR — Reject leave
  // ---------------------------------------------------------------------------
  @Roles('ADMIN', 'HR')
  @Put(':id/reject')
  async rejectLeave(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.svc.rejectLeave(req.user.sub, id, body.approverId);
  }
}
