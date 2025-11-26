/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// src/dashboard/dashboard.controller.ts

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 📊 ADMIN / HR / MANAGER DASHBOARD
   * Route: GET /dashboard/data
   */
  @Roles('ADMIN', 'HR', 'MANAGER')
  @Get('data')
  async getAdminDashboard() {
    return this.dashboardService.getDashboardData();
  }

  /**
   * 👤 EMPLOYEE DASHBOARD
   * Route: GET /dashboard/employee
   */
  @Roles('EMPLOYEE')
  @Get('employee')
  async getEmployeeDashboard(@Req() req: any) {
    const userId: string = req.user?.id ?? req.user?.sub;

    if (!userId) {
      return { message: 'Invalid session: User ID missing in token' };
    }

    return this.dashboardService.getEmployeeDashboardData(userId);
  }
}
