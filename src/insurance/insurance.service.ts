/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { UpdateFinancialDto } from './dto/update-financial.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class InsuranceService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  // ────────────────
  // ✅ Helper: Check if should hide MD/CAO employees
  // ────────────────
  private shouldHideMDCAO(user?: any): boolean {
    return !user || (user.role !== 'MD' && user.role !== 'CAO');
  }

  async create(dto: CreateInsuranceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const insurance = await this.prisma.insurance.create({ data: dto });

    // 📝 Log insurance creation
    await this.auditLog.logInsuranceCreate(
      insurance.id,
      {
        employeeId: insurance.employeeId,
        policyNumber: insurance.policyNumber,
        provider: insurance.provider,
        coverageAmount: insurance.coverageAmount,
      },
      undefined,
      'ADMIN',
    );

    return insurance;
  }

  async findAll(user?: any, role?: string, employeeId?: string) {
    if (role === 'EMPLOYEE' && employeeId) {
      // Only return the logged-in employee's insurance records
      return this.prisma.insurance.findMany({
        where: { employeeId },
        select: {
          id: true,
          policyNumber: true,
          provider: true,
          startDate: true,
          endDate: true,
          coverageAmount: true,
          bonusPercent: true,
          ctcFileUrl: true,
          eCashAmount: true,
          convenienceFee: true,
          updatedAt: true,

          employeeId: true, // ✅ REQUIRED FOR CONVENIENCE CHARGES

          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: true,
              workEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If user is not MD/CAO, hide MD/CAO insurance records
    const where = this.shouldHideMDCAO(user)
      ? ({ employee: { user: { role: { notIn: ['MD', 'CAO'] } } } } as any)
      : undefined;

    // Default: admin or HR gets everything (except MD/CAO if not MD/CAO themselves)
    return this.prisma.insurance.findMany({
      where,
      select: {
        id: true,
        policyNumber: true,
        provider: true,
        startDate: true,
        endDate: true,
        coverageAmount: true,
        bonusPercent: true,
        ctcFileUrl: true,
        eCashAmount: true,
        convenienceFee: true,
        updatedAt: true,

        employeeId: true, // ✅ also add here for consistency

        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            workEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: any) {
    const insurance = await this.prisma.insurance.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });
    if (!insurance) throw new NotFoundException('Insurance record not found');

    // If user is not MD/CAO and insurance is for MD/CAO, forbid access
    if (this.shouldHideMDCAO(user) && insurance.employee?.user?.role && ['MD', 'CAO'].includes(insurance.employee.user.role)) {
      throw new NotFoundException('Insurance record not found');
    }

    return insurance;
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    
    const oldData = {
      policyNumber: exists.policyNumber,
      provider: exists.provider,
      coverageAmount: exists.coverageAmount,
    };

    const updated = await this.prisma.insurance.update({ where: { id }, data: dto });

    // 📝 Log insurance update
    await this.auditLog.logInsuranceUpdate(
      id,
      oldData,
      {
        policyNumber: updated.policyNumber,
        provider: updated.provider,
        coverageAmount: updated.coverageAmount,
      },
      undefined,
      'ADMIN',
    );

    return updated;
  }

  async updateFinancial(id: string, dto: UpdateFinancialDto) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    
    const oldData = {
      bonusPercent: exists.bonusPercent,
      eCashAmount: exists.eCashAmount,
      convenienceFee: exists.convenienceFee,
    };

    const updated = await this.prisma.insurance.update({
      where: { id },
      data: {
        bonusPercent: dto.bonusPercent,
        eCashAmount: dto.eCashAmount,
        convenienceFee: dto.convenienceFee,
      },
    });

    // 📝 Log insurance financial update
    await this.auditLog.logInsuranceUpdate(
      id,
      oldData,
      {
        bonusPercent: updated.bonusPercent,
        eCashAmount: updated.eCashAmount,
        convenienceFee: updated.convenienceFee,
      },
      undefined,
      'ADMIN',
    );

    return updated;
  }

  async remove(id: string) {
    const exists = await this.prisma.insurance.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Insurance not found');
    
    const insuranceData = {
      id: exists.id,
      employeeId: exists.employeeId,
      policyNumber: exists.policyNumber,
      provider: exists.provider,
      coverageAmount: exists.coverageAmount,
    };

    await this.prisma.insurance.delete({ where: { id } });

    // 📝 Log insurance deletion
    await this.auditLog.logInsuranceDelete(
      id,
      insuranceData,
      undefined,
      'ADMIN',
    );

    return { message: 'Insurance record deleted successfully', id };
  }

  /**
   * Upload insurance document: persists file path into Document table
   */
  async uploadDocument(args: {
    employeeId: string;
    insuranceId?: string; // saved as title for correlation
    storageUrl?: string;
    originalName?: string;
    uploadedBy?: string;
  }) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: args.employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const doc = await this.prisma.document.create({
      data: {
        employeeId: args.employeeId,
        title: args.insuranceId ?? args.originalName ?? 'Insurance Document',
        type: 'INSURANCE',
        storageUrl: args.storageUrl ?? '',
        uploadedBy: args.uploadedBy,
      },
      select: {
        id: true,
        title: true,
        type: true,
        storageUrl: true,
        createdAt: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return doc;
  }

  /**
   * List insurance documents with filters and role-based scoping
   */
  async listDocuments(args: {
    employeeId?: string;
    insuranceId?: string; // matched to title
    requesterRole: string;
    requesterEmployeeId?: string;
  }) {
    const where: any = { type: 'INSURANCE' };
    if (args.employeeId) where.employeeId = args.employeeId;
    if (args.insuranceId) where.title = args.insuranceId;

    // Employees can only see their own
    if (args.requesterRole === 'EMPLOYEE') {
      where.employeeId = args.requesterEmployeeId;
    }

    return this.prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        storageUrl: true,
        createdAt: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete an insurance document (ADMIN/HR only via controller-level guard)
   * Removes DB row and attempts to unlink the physical file.
   */
  async deleteDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.type !== 'INSURANCE') {
      throw new NotFoundException('Insurance document not found');
    }

    // Attempt file removal if storageUrl exists and is inside uploads/insurance
    if (doc.storageUrl) {
      try {
        // storageUrl stored like /uploads/insurance/filename.ext
        const relative = doc.storageUrl.startsWith('/')
          ? doc.storageUrl.slice(1)
          : doc.storageUrl;
        // Prevent escaping intended directory
        if (relative.startsWith('uploads/insurance')) {
          const fullPath = path.join(process.cwd(), relative);
          await fs.unlink(fullPath).catch(() => undefined); // ignore if missing
        }
      } catch {
        // Silently ignore file system errors; DB deletion proceeds
      }
    }

    await this.prisma.document.delete({ where: { id } });
    return { id, deleted: true };
  }
}
