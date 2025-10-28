/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const [
      totalEmployees,
      upcomingBirthdays,
      newJoiners,
      departingMembers,
      workAnniversaries,
      upcomingHolidays,
      leaveAvailability,
      activeLeaveRequests,
      pendingPayrolls,
      departmentCounts,
    ] = await Promise.all([
      this.getTotalEmployees(),
      this.getUpcomingBirthdays(),
      this.getNewJoiners(),
      this.getDepartingMembers(),
      this.getWorkAnniversaries(),
      this.getUpcomingHolidays(),
      this.getLeaveAvailability(),
      this.getActiveLeaveRequests(),
      this.getPendingPayrolls(),
      this.getDepartmentCounts(),
    ]);

    return {
      stats: {
        totalEmployees,
        activeLeaveRequests,
        pendingPayrolls,
      },
      upcomingBirthdays,
      newJoiners,
      departingMembers,
      workAnniversaries,
      upcomingHolidays,
      leaveAvailability,
      departmentCounts,
    };
  }

  private async getTotalEmployees(): Promise<number> {
    return await this.prisma.employee.count({
      where: { status: 'Active' },
    });
  }

  private async getUpcomingBirthdays() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'Active',
        birthdate: {
          not: null,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthdate: true,
      },
    });

    // Filter for upcoming birthdays in the next 30 days
    const upcomingBirthdays = employees
      .filter((employee) => {
        if (!employee.birthdate) return false;

        const birthday = new Date(employee.birthdate);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate(),
        );
        const nextYearBirthday = new Date(
          today.getFullYear() + 1,
          birthday.getMonth(),
          birthday.getDate(),
        );

        const daysDiff =
          (thisYearBirthday.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24);
        const nextYearDaysDiff =
          (nextYearBirthday.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24);

        return (
          (daysDiff >= 0 && daysDiff <= 30) ||
          (nextYearDaysDiff >= 0 && nextYearDaysDiff <= 30)
        );
      })
      .map((employee) => {
        const birthday = new Date(employee.birthdate!);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate(),
        );
        const nextYearBirthday = new Date(
          today.getFullYear() + 1,
          birthday.getMonth(),
          birthday.getDate(),
        );

        const upcomingDate =
          thisYearBirthday >= today ? thisYearBirthday : nextYearBirthday;

        return {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          date: upcomingDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          avatar: `${employee.firstName[0]}${employee.lastName[0]}`,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    return upcomingBirthdays;
  }

  private async getNewJoiners() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.prisma.employee
      .findMany({
        where: {
          hireDate: {
            gte: thirtyDaysAgo,
          },
          status: 'Active',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          hireDate: true,
        },
        orderBy: { hireDate: 'desc' },
        take: 5,
      })
      .then((employees) =>
        employees.map((employee) => ({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          role: employee.department || 'Employee',
          date: employee.hireDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          avatar: `${employee.firstName[0]}${employee.lastName[0]}`,
        })),
      );
  }

  private async getDepartingMembers() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    return await this.prisma.employee
      .findMany({
        where: {
          terminationDate: {
            gte: today,
            lte: nextMonth,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          terminationDate: true,
        },
        orderBy: { terminationDate: 'asc' },
        take: 5,
      })
      .then((employees) =>
        employees.map((employee) => ({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department || 'Unknown',
          date: employee.terminationDate!.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          avatar: `${employee.firstName[0]}${employee.lastName[0]}`,
        })),
      );
  }

  private async getWorkAnniversaries() {
    const today = new Date();
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'Active',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
      },
    });

    const anniversaries = employees
      .filter((employee) => {
        const hireDate = new Date(employee.hireDate);
        const thisYearAnniversary = new Date(
          today.getFullYear(),
          hireDate.getMonth(),
          hireDate.getDate(),
        );
        const daysDiff =
          (thisYearAnniversary.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24);

        return (
          daysDiff >= 0 &&
          daysDiff <= 30 &&
          today.getFullYear() > hireDate.getFullYear()
        );
      })
      .map((employee) => {
        const hireDate = new Date(employee.hireDate);
        const years = today.getFullYear() - hireDate.getFullYear();
        const thisYearAnniversary = new Date(
          today.getFullYear(),
          hireDate.getMonth(),
          hireDate.getDate(),
        );

        return {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          years,
          date: thisYearAnniversary.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    return anniversaries;
  }

  private async getUpcomingHolidays() {
    const today = new Date();
    const nextThreeMonths = new Date();
    nextThreeMonths.setMonth(today.getMonth() + 3);

    return await this.prisma.holiday
      .findMany({
        where: {
          date: {
            gte: today,
            lte: nextThreeMonths,
          },
        },
        select: {
          id: true,
          name: true,
          date: true,
          description: true,
        },
        orderBy: { date: 'asc' },
        take: 5,
      })
      .then((holidays) =>
        holidays.map((holiday) => ({
          id: holiday.id,
          name: holiday.name,
          date: holiday.date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          description: holiday.description,
        })),
      );
  }

  private async getLeaveAvailability() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        period: currentMonth,
      },
    });

    const totalAllotted = balances.reduce(
      (sum, balance) => sum + balance.allotted,
      0,
    );
    const totalUsed = balances.reduce((sum, balance) => sum + balance.used, 0);
    const totalAvailable = totalAllotted - totalUsed;

    const approvedPercentage =
      totalAllotted > 0 ? Math.round((totalUsed / totalAllotted) * 100) : 0;
    const availablePercentage =
      totalAllotted > 0
        ? Math.round((totalAvailable / totalAllotted) * 100)
        : 100;

    // Mock pending and expired for now - you can enhance this based on your leave request logic
    const pendingPercentage = Math.max(
      0,
      100 - approvedPercentage - availablePercentage,
    );
    const expiredPercentage = 0;

    return {
      approved: approvedPercentage,
      available: availablePercentage,
      pending: pendingPercentage,
      expired: expiredPercentage,
    };
  }

  private async getActiveLeaveRequests(): Promise<number> {
    return await this.prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
      },
    });
  }

  private async getPendingPayrolls(): Promise<number> {
    return await this.prisma.payrollRun.count({
      where: {
        status: 'DRAFT',
      },
    });
  }

  private async getDepartmentCounts() {
    const departments = await this.prisma.employee.groupBy({
      by: ['department'],
      where: {
        status: 'Active',
        department: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    return departments.map((dept) => ({
      department: dept.department || 'Unknown',
      count: dept._count.id,
    }));
  }

  async getEmployeeDashboardData(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        hireDate: true,
        status: true,
      },
    });
    if (!employee) return { message: 'Employee not found' };

    const [
      leaveAvailability,
      upcomingHolidays,
      upcomingBirthdays,
      workAnniversaries,
      recentActivity,
      lastPayslip,
    ] = await Promise.all([
      this.getEmployeeLeaveBalance(employee.id),
      this.getUpcomingHolidays(),
      this.getUpcomingBirthdays(),
      this.getWorkAnniversaries(),
      this.getRecentActivity(employee.id),
      this.prisma.payslip.findFirst({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      employee,
      leaveAvailability,
      upcomingHolidays,
      upcomingBirthdays,
      workAnniversaries,
      recentActivity,
      lastSalaryDate: lastPayslip?.createdAt ?? null,
      departmentCounts: await this.getDepartmentCounts(),
    };
  }

  /**
   * Employee leave summary
   */
  private async getEmployeeLeaveBalance(employeeId: string) {
    const period = new Date().toISOString().slice(0, 7);
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, period },
    });
    const allotted = balances.reduce((s, b) => s + (b.allotted ?? 0), 0);
    const used = balances.reduce((s, b) => s + (b.used ?? 0), 0);
    return {
      total: allotted,
      used,
      available: allotted - used,
      pending: Math.floor(allotted * 0.05),
    };
  }

  /**
   * Simple recent-activity mock
   */
  private async getRecentActivity(employeeId: string) {
    return [
      '💰 Salary credited for last month',
      '🗓️ Leave approved by manager',
      '🎯 Performance goals updated',
    ];
  }
}
