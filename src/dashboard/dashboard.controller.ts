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
  constructor(private dashboardService: DashboardService) {}

  /**
   * 📊 Admin / HR / Manager dashboard
   */
  @Roles('ADMIN', 'HR', 'MANAGER')
  @Get('data')
  getDashboardData() {
    return this.dashboardService.getDashboardData();
  }

  /**
   * 👤 Employee dashboard (self-view)
   */
  @Roles('EMPLOYEE')
  @Get('employee')
  async getEmployeeDashboard(@Req() req) {
    const userId = req.user.id;
    return this.dashboardService.getEmployeeDashboardData(userId);
  }
}
