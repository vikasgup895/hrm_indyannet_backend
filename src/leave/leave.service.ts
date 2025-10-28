/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import { BadRequestException, Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma.service';

// @Injectable()
// export class LeaveService {
//   constructor(private prisma: PrismaService) {}

//   // 🧾 EMPLOYEE — Apply for leave
//   async requestLeave(userId: string, dto: any) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });

//     if (!employee) {
//       throw new BadRequestException('Employee record not found for this user');
//     }

//     const policy = await this.prisma.leavePolicy.findUnique({
//       where: { id: dto.policyId },
//     });

//     if (!policy) {
//       throw new BadRequestException('Invalid leave policy');
//     }

//     return this.prisma.leaveRequest.create({
//       data: {
//         employeeId: employee.id,
//         policyId: dto.policyId,
//         startDate: dto.startDate,
//         endDate: dto.endDate,
//         days: dto.days,
//         reason: dto.reason,
//         status: 'PENDING',
//       },
//     });
//   }

//   // 👑 ADMIN/HR — Create new leave policy
//   async createPolicy(dto: any) {
//     const {
//       name,
//       region = 'IN',
//       accrualPerMonth = 0,
//       annualQuota = 12,
//       carryForward = false,
//       maxCarryForward = 0,
//       requiresDocAfter = 0,
//     } = dto;

//     // Prevent duplicate policy names
//     const existing = await this.prisma.leavePolicy.findUnique({
//       where: { name },
//     });
//     if (existing) {
//       throw new BadRequestException(`Policy "${name}" already exists`);
//     }

//     const policy = await this.prisma.leavePolicy.create({
//       data: {
//         name,
//         region,
//         accrualPerMonth,
//         annualQuota,
//         carryForward,
//         maxCarryForward,
//         requiresDocAfter,
//       },
//     });

//     return {
//       message: '✅ Leave policy created successfully',
//       policy,
//     };
//   }

//   // 👀 EMPLOYEE — Get all leave types with balances (even if unused)
//   async getEmployeeAllLeaveTypes(userId: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });

//     if (!employee) throw new BadRequestException('Employee not found');

//     const policies = await this.prisma.leavePolicy.findMany({
//       select: {
//         id: true,
//         name: true,
//         accrualPerMonth: true,
//         maxCarryForward: true,
//       },
//     });

//     const balances = await this.prisma.leaveBalance.findMany({
//       where: { employeeId: employee.id },
//       select: {
//         policyId: true,
//         opening: true,
//         used: true,
//         closing: true,
//         period: true,
//       },
//     });

//     // Merge policies + balances (show zero if no balance)
//     const merged = policies.map((p) => {
//       const bal = balances.find((b) => b.policyId === p.id);
//       return {
//         policyId: p.id,
//         policyName: p.name,
//         accrualPerMonth: p.accrualPerMonth,
//         allotted: bal?.opening ?? 0,
//         used: bal?.used ?? 0,
//         remaining: bal?.closing ?? 0,
//         period: bal?.period ?? new Date().toISOString().slice(0, 7),
//       };
//     });

//     return { total: merged.length, data: merged };
//   }

//   // 🗑️ ADMIN/HR — Delete a leave policy
//   async deleteLeavePolicy(policyId: string) {
//     const existing = await this.prisma.leavePolicy.findUnique({
//       where: { id: policyId },
//     });

//     if (!existing) {
//       throw new BadRequestException('Leave policy not found');
//     }

//     // Optional: Check if this policy is in use
//     const isInUse = await this.prisma.leaveBalance.findFirst({
//       where: { policyId },
//     });

//     if (isInUse) {
//       throw new BadRequestException(
//         'Cannot delete policy — it is assigned to one or more employees',
//       );
//     }

//     await this.prisma.leavePolicy.delete({
//       where: { id: policyId },
//     });

//     return { message: '✅ Leave policy deleted successfully' };
//   }

//   // 👀 EMPLOYEE — View own leave requests
//   async getEmployeeLeaves(userId: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });
//     if (!employee) throw new BadRequestException('Employee record not found');

//     const requests = await this.prisma.leaveRequest.findMany({
//       where: { employeeId: employee.id },
//       orderBy: { createdAt: 'desc' },
//       include: {
//         policy: { select: { name: true } },
//       },
//     });

//     return { count: requests.length, data: requests };
//   }

//   // 👤 EMPLOYEE — View their leave balances
//   async getEmployeeBalances(userId: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });
//     if (!employee) throw new BadRequestException('Employee record not found');

//     const balances = await this.prisma.leaveBalance.findMany({
//       where: { employeeId: employee.id },
//       include: {
//         policy: {
//           select: {
//             name: true,
//             accrualPerMonth: true,
//           },
//         },
//       },
//       orderBy: { period: 'desc' },
//     });

//     return {
//       totalPolicies: balances.length,
//       data: balances.map((b) => ({
//         policyName: b.policy.name,
//         accrualPerMonth: b.policy.accrualPerMonth,
//         opening: b.opening,
//         used: b.used,
//         closing: b.closing,
//         period: b.period,
//       })),
//     };
//   }
//   // 👑 ADMIN/HR — Assign or update leave balance for one or multiple employees
//   async setEmployeeLeaveBalance(dto: any, userRole: string) {
//     if (userRole !== 'ADMIN' && userRole !== 'HR') {
//       throw new BadRequestException(
//         'Access denied. Only HR or Admin can assign leaves.',
//       );
//     }

//     // 👇 Normalize to array if single object
//     const assignments = Array.isArray(dto) ? dto : [dto];
//     const results: any[] = []; // ✅ Fix: prevent 'never' type error

//     for (const item of assignments) {
//       const { employeeId, policyId, days } = item;

//       if (!employeeId || !policyId) {
//         throw new BadRequestException(
//           'Missing employeeId or policyId in request.',
//         );
//       }

//       // 🔍 Validate employee and policy exist
//       const [employee, policy] = await Promise.all([
//         this.prisma.employee.findUnique({ where: { id: employeeId } }),
//         this.prisma.leavePolicy.findUnique({ where: { id: policyId } }),
//       ]);

//       if (!employee)
//         throw new BadRequestException(`Employee ${employeeId} not found`);
//       if (!policy)
//         throw new BadRequestException(`Leave policy ${policyId} not found`);

//       const currentPeriod = new Date().toISOString().slice(0, 7); // e.g. "2025-10"

//       // ✅ Create or update balance
//       const balance = await this.prisma.leaveBalance.upsert({
//         where: {
//           employeeId_policyId_period: {
//             employeeId,
//             policyId,
//             period: currentPeriod,
//           },
//         },
//         update: {
//           allotted: days,
//           opening: days,
//           used: 0,
//           closing: days,
//         },
//         create: {
//           employeeId,
//           policyId,
//           period: currentPeriod,
//           allotted: days,
//           opening: days,
//           used: 0,
//           closing: days,
//         },
//         include: {
//           employee: {
//             select: { firstName: true, lastName: true, department: true },
//           },
//           policy: { select: { name: true } },
//         },
//       });

//       results.push(balance);
//     }

//     return {
//       message: '✅ Leave balances assigned successfully',
//       count: results.length,
//       data: results,
//     };
//   }

//   // 📜 Fetch all leave policies
//   async getAllPolicies() {
//     const policies = await this.prisma.leavePolicy.findMany({
//       orderBy: { createdAt: 'desc' },
//       select: {
//         id: true,
//         name: true,
//         region: true,
//         accrualPerMonth: true,
//         annualQuota: true,
//         carryForward: true,
//         maxCarryForward: true,
//       },
//     });

//     return {
//       total: policies.length,
//       data: policies,
//     };
//   }

//   // ✅ MANAGER/ADMIN — Approve or Reject
//   async handleLeaveDecision(
//     requestId: string,
//     approverId: string,
//     decision: 'APPROVED' | 'REJECTED',
//     comment?: string,
//   ) {
//     const request = await this.prisma.leaveRequest.findUnique({
//       where: { id: requestId },
//     });
//     if (!request) throw new BadRequestException('Leave request not found');
//     if (request.status !== 'PENDING')
//       throw new BadRequestException('Leave already processed');

//     const updated = await this.prisma.leaveRequest.update({
//       where: { id: requestId },
//       data: {
//         status: decision,
//         approverId,
//         reason: comment || request.reason,
//       },
//       include: { employee: true, policy: true },
//     });

//     if (decision === 'APPROVED') {
//       await this.prisma.leaveBalance.updateMany({
//         where: {
//           employeeId: request.employeeId,
//           policyId: request.policyId,
//           period: new Date().toISOString().slice(0, 7),
//         },
//         data: {
//           used: { increment: request.days },
//           closing: { decrement: request.days },
//         },
//       });
//     }

//     return { message: `Leave ${decision.toLowerCase()} successfully`, updated };
//   }

//   // 📊 HR/ADMIN — View all leave requests
//   async getAllRequests() {
//     const requests = await this.prisma.leaveRequest.findMany({
//       orderBy: { createdAt: 'desc' },
//       include: {
//         employee: {
//           select: {
//             firstName: true,
//             lastName: true,
//             department: true,
//             workEmail: true,
//           },
//         },
//         policy: { select: { name: true } },
//       },
//     });
//     return { totalRequests: requests.length, data: requests };
//   }

//   // 📅 HR/ADMIN — View all leave balances
//   async getAllBalances() {
//     const balances = await this.prisma.leaveBalance.findMany({
//       include: {
//         employee: {
//           select: {
//             firstName: true,
//             lastName: true,
//             department: true,
//             workEmail: true,
//           },
//         },
//         policy: { select: { name: true, annualQuota: true } },
//       },
//       orderBy: { period: 'desc' },
//     });
//     return { total: balances.length, data: balances };
//   }
// }

// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { PrismaService } from '../prisma.service';

// @Injectable()
// export class LeaveService {
//   constructor(private prisma: PrismaService) {}

//   // 🧭 Get all leave policies (frontend demo / static version)
//   async getPolicies() {
//     return {
//       data: [
//         {
//           id: 'pol_annual',
//           name: 'Annual',
//           period: 'Annual',
//           maxPerPeriod: 12,
//         },
//         { id: 'pol_sick', name: 'Sick', period: 'Annual', maxPerPeriod: 10 },
//         { id: 'pol_casual', name: 'Casual', period: 'Annual', maxPerPeriod: 6 },
//       ],
//     };
//   }

//   // 🧾 Get current user’s leave balances
//   async getMyBalances(userId: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });

//     if (!employee) throw new NotFoundException('Employee not found');

//     const balances = await this.prisma.leaveBalance.findMany({
//       where: { employeeId: employee.id },
//       include: {
//         policy: { select: { name: true, annualQuota: true } },
//       },
//     });

//     const formatted = balances.map((b) => ({
//       policyId: b.policyId,
//       policyName: b.policy.name,
//       available: b.closing,
//       used: b.used,
//     }));

//     return { data: formatted };
//   }

//   // 📄 Get user’s leave requests
//   async getMyRequests(userId: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });

//     if (!employee) throw new NotFoundException('Employee not found');

//     const requests = await this.prisma.leaveRequest.findMany({
//       where: { employeeId: employee.id },
//       orderBy: { createdAt: 'desc' },
//       include: {
//         policy: { select: { name: true } },
//       },
//     });

//     return { data: requests };
//   }

//   // 📝 Create a new leave request
//   async createLeaveRequest(userId: string, body: any) {
//     const { policyId, startDate, endDate, days, halfDay, reason } = body;

//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });
//     if (!employee) throw new NotFoundException('Employee not found');

//     // Resolve policy ID mapping
//     const policyMap = {
//       pol_annual: 'Annual Leave',
//       pol_sick: 'Sick Leave',
//       pol_casual: 'Casual Leave',
//     };

//     const policy =
//       (await this.prisma.leavePolicy.findUnique({
//         where: { id: policyId },
//       })) ||
//       (await this.prisma.leavePolicy.findFirst({
//         where: {
//           name: {
//             equals: policyMap[policyId] || policyId,
//             mode: 'insensitive',
//           },
//         },
//       }));

//     if (!policy)
//       throw new BadRequestException(`Policy ${policyId} not found in system`);

//     const leave = await this.prisma.leaveRequest.create({
//       data: {
//         employeeId: employee.id,
//         policyId: policy.id,
//         startDate: new Date(startDate),
//         endDate: new Date(endDate),
//         days,
//         halfDay: !!halfDay,
//         reason,
//         status: 'PENDING',
//       },
//       include: { policy: { select: { name: true } } },
//     });

//     return { data: leave };
//   }

//   // ❌ Cancel a pending leave
//   async cancelLeave(userId: string, id: string) {
//     const employee = await this.prisma.employee.findFirst({
//       where: { userId },
//     });

//     if (!employee) throw new NotFoundException('Employee not found');

//     const leave = await this.prisma.leaveRequest.findFirst({
//       where: { id, employeeId: employee.id },
//     });

//     if (!leave) throw new NotFoundException('Leave not found');
//     if (leave.status !== 'PENDING')
//       throw new BadRequestException('Only pending requests can be cancelled');

//     const updated = await this.prisma.leaveRequest.update({
//       where: { id },
//       data: { status: 'CANCELLED' },
//     });

//     return { message: 'Leave cancelled successfully', data: updated };
//   }

//   // 👑 ADMIN/HR — Assign leave balances (supports fake policy IDs)
//   async setEmployeeLeaveBalance(dto: any, userRole: string) {
//     if (userRole !== 'ADMIN' && userRole !== 'HR') {
//       throw new BadRequestException(
//         'Access denied. Only HR/Admin can assign leaves.',
//       );
//     }

//     const assignments = Array.isArray(dto) ? dto : [dto];
//     const results: any[] = [];

//     // Map mock policy IDs to real names
//     const policyMap = {
//       pol_annual: 'Annual Leave',
//       pol_sick: 'Sick Leave',
//       pol_casual: 'Casual Leave',
//     };

//     for (const item of assignments) {
//       const { employeeId, policyId, days } = item;

//       if (!employeeId || !policyId) {
//         throw new BadRequestException('Missing employeeId or policyId.');
//       }

//       // Try finding by ID first, then by name mapping
//       const policy =
//         (await this.prisma.leavePolicy.findUnique({
//           where: { id: policyId },
//         })) ||
//         (await this.prisma.leavePolicy.findFirst({
//           where: {
//             name: {
//               equals: policyMap[policyId] || policyId,
//               mode: 'insensitive',
//             },
//           },
//         }));

//       const employee = await this.prisma.employee.findUnique({
//         where: { id: employeeId },
//       });

//       if (!employee)
//         throw new BadRequestException(`Employee ${employeeId} not found`);
//       if (!policy)
//         throw new BadRequestException(`Policy ${policyId} not found`);

//       const period = new Date().toISOString().slice(0, 7);

//       const balance = await this.prisma.leaveBalance.upsert({
//         where: {
//           employeeId_policyId_period: {
//             employeeId,
//             policyId: policy.id,
//             period,
//           },
//         },
//         update: { opening: days, used: 0, closing: days },
//         create: {
//           employeeId,
//           policyId: policy.id,
//           period,
//           opening: days,
//           used: 0,
//           closing: days,
//         },
//         include: { employee: true, policy: true },
//       });

//       results.push(balance);
//     }

//     const batchId = `batch_${Date.now()}`;

//     return {
//       message: '✅ Leave balances assigned successfully',
//       batchId,
//       data: results,
//     };
//   }

//   async undoLastAssignment(batchId: string) {
//     return {
//       message: `↩️ Assignment batch ${batchId} undone successfully`,
//     };
//   }

//   // 👑 ADMIN/HR — Get all employees’ leave requests
//   async getAllLeaveRequests() {
//     const requests = await this.prisma.leaveRequest.findMany({
//       include: {
//         employee: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             department: true,
//           },
//         },
//         policy: { select: { name: true } },
//       },
//       orderBy: { createdAt: 'desc' },
//     });

//     return { data: requests };
//   }

//   // ✅ Approve leave
//   async approveLeave(userId: string, leaveId: string, approverId?: string) {
//     const admin = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!admin) throw new BadRequestException('Invalid approver');

//     const leave = await this.prisma.leaveRequest.findUnique({
//       where: { id: leaveId },
//     });
//     if (!leave) throw new NotFoundException('Leave request not found');

//     if (leave.status !== 'PENDING')
//       throw new BadRequestException('Only pending requests can be approved');

//     const updated = await this.prisma.leaveRequest.update({
//       where: { id: leaveId },
//       data: {
//         status: 'APPROVED',
//         approverId: approverId || userId,
//         approvedAt: new Date(),
//       },
//     });

//     return { message: '✅ Leave request approved successfully', data: updated };
//   }

//   // ❌ Reject leave
//   async rejectLeave(userId: string, leaveId: string, approverId?: string) {
//     const admin = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!admin) throw new BadRequestException('Invalid approver');

//     const leave = await this.prisma.leaveRequest.findUnique({
//       where: { id: leaveId },
//     });
//     if (!leave) throw new NotFoundException('Leave request not found');

//     if (leave.status !== 'PENDING')
//       throw new BadRequestException('Only pending requests can be rejected');

//     const updated = await this.prisma.leaveRequest.update({
//       where: { id: leaveId },
//       data: {
//         status: 'REJECTED',
//         approverId: approverId || userId,
//         approvedAt: new Date(),
//       },
//     });

//     return { message: '❌ Leave request rejected', data: updated };
//   }
// }

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { addMonths, getMonth } from 'date-fns';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 🧭 EMPLOYEE: Get leave policies
  // ---------------------------------------------------------------------------
  async getPolicies() {
    const policies = await this.prisma.leavePolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { total: policies.length, data: policies };
  }

  // ---------------------------------------------------------------------------
  // 🧾 EMPLOYEE: Get my leave balances
  // ---------------------------------------------------------------------------
  async getMyBalances(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId: employee.id },
      include: { policy: { select: { name: true, annualQuota: true } } },
      orderBy: { period: 'desc' },
    });

    const formatted = balances.map((b) => ({
      policyId: b.policyId,
      policyName: b.policy.name,
      opening: b.opening,
      used: b.used,
      closing: b.closing,
      available: b.closing,
      period: b.period,
    }));

    return { total: formatted.length, data: formatted };
  }

  // ---------------------------------------------------------------------------
  // 📄 EMPLOYEE: Get my leave requests
  // ---------------------------------------------------------------------------
  async getMyRequests(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: { policy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { total: requests.length, data: requests };
  }

  // ---------------------------------------------------------------------------
  // 📝 EMPLOYEE: Request leave (with probation + loss of pay check)
  // ---------------------------------------------------------------------------
  async createLeaveRequest(userId: string, body: any) {
    const { policyId, startDate, endDate, days, halfDay, reason } = body;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // 🚫 Check probation
    if (employee.status.toLowerCase() === 'probation') {
      throw new ForbiddenException(
        'You are currently on probation. Paid leave not allowed.',
      );
    }

    // 🔍 Get policy
    const policy = await this.prisma.leavePolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new BadRequestException('Invalid leave policy');

    // 🔍 Get current balance
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const balance = await this.prisma.leaveBalance.findFirst({
      where: { employeeId: employee.id, policyId, period: currentPeriod },
    });

    if (policy.name === "Special Leave") {
      // --- Monthly limit logic (max 1 per month) ---
      const requestYear = new Date(startDate).getFullYear();
      const requestMonth = new Date(startDate).getMonth();
    
      // Count all approved or pending special leaves in the same month for this employee
      const specialLeaveCountThisMonth = await this.prisma.leaveRequest.count({
        where: {
          employeeId: employee.id,
          policyId: policy.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: {
            gte: new Date(requestYear, requestMonth, 1),
            lt: new Date(requestYear, requestMonth + 1, 1)
          }
        }
      });
    
      if (specialLeaveCountThisMonth >= 1) {
        throw new BadRequestException("You can apply for only 1 Special Leave per month.");
      }
    
      // --- Yearly limit logic (max 12 per year) ---
      const specialLeaveCountThisYear = await this.prisma.leaveRequest.count({
        where: {
          employeeId: employee.id,
          policyId: policy.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: {
            gte: new Date(requestYear, 0, 1),
            lt: new Date(requestYear + 1, 0, 1)
          }
        }
      });
    
      if (specialLeaveCountThisYear >= 12) {
        throw new BadRequestException("You cannot exceed 12 Special Leaves per year.");
      }
    }

    if (!balance) {
      throw new BadRequestException(
        'No leave balance available for this policy.',
      );
    }

    // ⚠️ Check insufficient balance → Loss of Pay alert
    if (balance.closing < days) {
      throw new BadRequestException(
        'Insufficient leave balance — applying this leave will result in Loss of Pay.',
      );
    }

    // ✅ Create request
    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        policyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        halfDay: !!halfDay,
        reason,
        status: 'PENDING',
      },
      include: { policy: true },
    });

    return { message: '✅ Leave request submitted successfully', data: leave };
  }

  // ---------------------------------------------------------------------------
  // ❌ EMPLOYEE: Cancel leave
  // ---------------------------------------------------------------------------
  async cancelLeave(userId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id, employeeId: employee.id },
    });
    if (!leave) throw new NotFoundException('Leave not found');

    if (leave.status !== 'PENDING')
      throw new BadRequestException('Only pending requests can be cancelled.');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Leave cancelled successfully', data: updated };
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR: Create new leave policy
  // ---------------------------------------------------------------------------
  async createPolicy(dto: any) {
    const {
      name,
      region = 'IN',
      accrualPerMonth = 1.75,
      annualQuota = 12,
      carryForward = true,
      maxCarryForward = 12,
      requiresDocAfter = 3,
    } = dto;

    const existing = await this.prisma.leavePolicy.findUnique({
      where: { name },
    });
    if (existing)
      throw new BadRequestException(`Policy "${name}" already exists.`);

    const policy = await this.prisma.leavePolicy.create({
      data: {
        name,
        region,
        accrualPerMonth,
        annualQuota,
        carryForward,
        maxCarryForward,
        requiresDocAfter,
      },
    });

    return { message: '✅ Leave policy created successfully', data: policy };
  }

  // ---------------------------------------------------------------------------
  // ♻️ ADMIN/HR: Carry forward unused paid leaves
  // ---------------------------------------------------------------------------
  async carryForwardLeaves() {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'Active' },
      include: {
        leaveBalances: { include: { policy: true } },
      },
    });

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const nextMonth = addMonths(now, 1).toISOString().slice(0, 7);

    for (const emp of employees) {
      for (const bal of emp.leaveBalances) {
        if (bal.period !== thisMonth) continue;
        if (!bal.policy.carryForward) continue;
        if (emp.status.toLowerCase() === 'probation') continue;

        const unused = bal.closing;
        if (unused <= 0) continue;

        // 🚫 If December and e-cash claimed → skip carry forward
        if (getMonth(now) === 11) {
          const eCash = await this.prisma.insurance.findFirst({
            where: { employeeId: emp.id, eCashAmount: { gt: 0 } },
          });
          if (eCash) continue;
        }

        // ✅ Carry forward
        await this.prisma.leaveBalance.upsert({
          where: {
            employeeId_policyId_period: {
              employeeId: emp.id,
              policyId: bal.policyId,
              period: nextMonth,
            },
          },
          update: {
            opening: { increment: unused },
            closing: { increment: unused },
          },
          create: {
            employeeId: emp.id,
            policyId: bal.policyId,
            period: nextMonth,
            opening: unused,
            accrued: 0,
            used: 0,
            closing: unused,
          },
        });
      }
    }

    return { message: '✅ Carry-forward completed successfully' };
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR: Assign leave balances
  // ---------------------------------------------------------------------------
  async setEmployeeLeaveBalance(dto: any, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'HR')
      throw new BadRequestException('Access denied.');

    const assignments = Array.isArray(dto) ? dto : [dto];
    // const results = [];
    const results: any[] = [];

    for (const item of assignments) {
      const { employeeId, policyId, days } = item;
      if (!employeeId || !policyId)
        throw new BadRequestException('Missing employeeId or policyId.');

      const [employee, policy] = await Promise.all([
        this.prisma.employee.findUnique({ where: { id: employeeId } }),
        this.prisma.leavePolicy.findUnique({ where: { id: policyId } }),
      ]);

      if (!employee) throw new BadRequestException('Employee not found');
      if (!policy) throw new BadRequestException('Policy not found');

      const period = new Date().toISOString().slice(0, 7);
      const balance = await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_policyId_period: { employeeId, policyId, period },
        },
        update: { opening: days, used: 0, closing: days },
        create: {
          employeeId,
          policyId,
          period,
          opening: days,
          used: 0,
          closing: days,
        },
        include: { employee: true, policy: true },
      });

      results.push(balance);
    }

    return {
      message: '✅ Leave balances assigned successfully',
      count: results.length,
      data: results,
    };
  }

  // ---------------------------------------------------------------------------
  // 👑 ADMIN/HR: Approve leave (auto deduct from balance)
  // ---------------------------------------------------------------------------
  async approveLeave(userId: string, leaveId: string, approverId?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!admin) throw new BadRequestException('Invalid approver');

    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });
    if (!leave) throw new NotFoundException('Leave not found');

    if (leave.status !== 'PENDING')
      throw new BadRequestException('Leave already processed.');

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: 'APPROVED',
        approverId: approverId || userId,
        approvedAt: new Date(),
      },
    });

    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: leave.employeeId,
        policyId: leave.policyId,
        period: new Date().toISOString().slice(0, 7),
      },
      data: {
        used: { increment: leave.days },
        closing: { decrement: leave.days },
      },
    });

    return { message: '✅ Leave approved successfully', data: updated };
  }

  // ---------------------------------------------------------------------------
  // ❌ ADMIN/HR: Reject leave
  // ---------------------------------------------------------------------------
  async rejectLeave(userId: string, leaveId: string, approverId?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!admin) throw new BadRequestException('Invalid approver');

    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });
    if (!leave) throw new NotFoundException('Leave not found');

    if (leave.status !== 'PENDING')
      throw new BadRequestException('Only pending requests can be rejected.');

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: 'REJECTED',
        approverId: approverId || userId,
        approvedAt: new Date(),
      },
    });

    return { message: '❌ Leave request rejected', data: updated };
  }

  // ---------------------------------------------------------------------------
  // 📊 ADMIN/HR: Get all leave requests
  // ---------------------------------------------------------------------------
  async getAllLeaveRequests() {
    const requests = await this.prisma.leaveRequest.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            workEmail: true,
          },
        },
        policy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { total: requests.length, data: requests };
  }

  // 🔁 Optional — Undo last leave balance assignment (mock)
  async undoLastAssignment(batchId: string) {
    // You can later implement actual reversal logic if you track assignment batches.
    return {
      message: `↩️ Assignment batch ${batchId} undone successfully`,
    };
  }

  // ---------------------------------------------------------------------------
  // 📅 ADMIN/HR: Get all balances
  // ---------------------------------------------------------------------------
  async getAllBalances() {
    const balances = await this.prisma.leaveBalance.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            workEmail: true,
          },
        },
        policy: { select: { name: true, annualQuota: true } },
      },
      orderBy: { period: 'desc' },
    });
    return { total: balances.length, data: balances };
  }
}
