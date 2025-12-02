/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
// src/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /* ────────────────────────────────
      ADMIN / HR DASHBOARD
  ──────────────────────────────── */
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
    return this.prisma.employee.count({ where: { status: 'Active' } });
  }

  private async getUpcomingBirthdays() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    const employees = await this.prisma.employee.findMany({
      where: { status: 'Active', birthdate: { not: null } },
      select: { id: true, firstName: true, lastName: true, birthdate: true },
    });

    return employees
      .filter((emp) => {
        if (!emp.birthdate) return false;
        const dob = new Date(emp.birthdate);
        const nextBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        const diff =
          (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        return diff >= 0 && diff <= 30;
      })
      .map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        date: new Date(
          today.getFullYear(),
          new Date(emp.birthdate!).getMonth(),
          new Date(emp.birthdate!).getDate(),
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        avatar: `${emp.firstName[0]}${emp.lastName[0]}`,
      }))
      .slice(0, 5);
  }

  private async getNewJoiners() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employees = await this.prisma.employee.findMany({
      where: { status: 'Active', hireDate: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        hireDate: true,
      },
      orderBy: { hireDate: 'desc' },
      take: 5,
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.department || 'Employee',
      date: emp.hireDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      avatar: `${emp.firstName[0]}${emp.lastName[0]}`,
    }));
  }

  private async getDepartingMembers() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const employees = await this.prisma.employee.findMany({
      where: { terminationDate: { gte: today, lte: nextMonth } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        terminationDate: true,
      },
      orderBy: { terminationDate: 'asc' },
      take: 5,
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department || 'Unknown',
      date: emp.terminationDate!.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      avatar: `${emp.firstName[0]}${emp.lastName[0]}`,
    }));
  }

  private async getWorkAnniversaries() {
    const today = new Date();

    const employees = await this.prisma.employee.findMany({
      where: { status: 'Active' },
      select: { id: true, firstName: true, lastName: true, hireDate: true },
    });

    return employees
      .filter((emp) => {
        const hire = new Date(emp.hireDate);
        const anniv = new Date(
          today.getFullYear(),
          hire.getMonth(),
          hire.getDate(),
        );
        const diff =
          (anniv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        return (
          diff >= 0 && diff <= 30 && today.getFullYear() > hire.getFullYear()
        );
      })
      .map((emp) => {
        const hire = new Date(emp.hireDate);
        const years = today.getFullYear() - hire.getFullYear();
        const anniv = new Date(
          today.getFullYear(),
          hire.getMonth(),
          hire.getDate(),
        );

        return {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          years,
          date: anniv.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      })
      .slice(0, 5);
  }

  private async getUpcomingHolidays() {
    const today = new Date();
    const nextThreeMonths = new Date(today);
    nextThreeMonths.setMonth(today.getMonth() + 3);

    const holidays = await this.prisma.holiday.findMany({
      where: { date: { gte: today, lte: nextThreeMonths } },
      select: { id: true, name: true, date: true, description: true },
      orderBy: { date: 'asc' },
      take: 5,
    });

    return holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      description: h.description,
    }));
  }

  private async getLeaveAvailability() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const balances = await this.prisma.leaveBalance.findMany({
      where: { period: currentMonth },
    });

    const totalAllotted = balances.reduce((s, b) => s + b.allotted, 0);
    const totalUsed = balances.reduce((s, b) => s + b.used, 0);

    return {
      approved: totalUsed ? Math.round((totalUsed / totalAllotted) * 100) : 0,
      available: totalAllotted
        ? Math.round(((totalAllotted - totalUsed) / totalAllotted) * 100)
        : 100,
      pending: 5,
      expired: 0,
    };
  }

  private async getActiveLeaveRequests() {
    return this.prisma.leaveRequest.count({ where: { status: 'PENDING' } });
  }

  private async getPendingPayrolls() {
    return this.prisma.payrollRun.count({ where: { status: 'DRAFT' } });
  }

  private async getDepartmentCounts() {
    const departments = await this.prisma.employee.groupBy({
      by: ['department'],
      where: { status: 'Active', department: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return departments.map((d) => ({
      department: d.department || 'Unknown',
      count: d._count.id,
    }));
  }

  /* ────────────────────────────────
      EMPLOYEE DASHBOARD
  ──────────────────────────────── */
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
      teamMembers,
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
      this.getTeamMembers(employee.department, employee.id),
    ]);

    return {
      employee,
      leaveAvailability,
      upcomingHolidays,
      upcomingBirthdays,
      workAnniversaries,
      recentActivity,
      teamMembers,
      lastSalaryDate: lastPayslip?.createdAt ?? null,
      departmentCounts: await this.getDepartmentCounts(),
    };
  }

  /* TEAM MEMBERS (same department) */
  private async getTeamMembers(department: string | null, employeeId: string) {
    if (!department) return [];

    const members = await this.prisma.employee.findMany({
      where: {
        department,
        status: 'Active',
        NOT: { id: employeeId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
      },
    });

    return members.map((m) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.designation || 'Employee',
      avatar: m.firstName[0],
    }));
  }

  /* LEAVE SUMMARY FOR EMPLOYEE */
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

  /* RECENT ACTIVITY MOCK */
  private async getRecentActivity(employeeId: string) {
    return [
      '💰 Salary credited for last month',
      '🗓️ Leave approved by manager',
      '🎯 Performance goals updated',
    ];
  }
}
