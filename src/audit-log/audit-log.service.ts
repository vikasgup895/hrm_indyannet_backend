import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LogParams {
  module: string; // "PAYSLIP", "INSURANCE"
  action: string; // "CREATE", "UPDATE", "DELETE"
  entityType: string; // "Payslip", "Insurance"
  entityId: string;
  employeeId?: string;
  actorId?: string;
  actorRole?: string;
  oldData?: any;
  newData?: any;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILED' | 'WARNING';
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event to the database
   */
  async log(params: LogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          employeeId: params.employeeId,
          actorId: params.actorId,
          actorRole: params.actorRole,
          oldData: params.oldData || null,
          newData: params.newData || null,
          changes: params.changes,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          status: params.status || 'SUCCESS',
          errorMessage: params.errorMessage,
        },
      });
    } catch (error) {
      // Silently fail logging to avoid disrupting main operations
      console.error('[AuditLog] Failed to log:', error);
    }
  }

  /**
   * Log payslip creation
   */
  async logPayslipCreate(
    payslipId: string,
    payslipData: any,
    actorId: string,
    actorRole: string,
  ) {
    return this.log({
      module: 'PAYSLIP',
      action: 'CREATE',
      entityType: 'Payslip',
      entityId: payslipId,
      employeeId: payslipData.employeeId,
      actorId,
      actorRole,
      newData: payslipData,
      changes: `Created payslip for employee ${payslipData.employeeId}`,
      status: 'SUCCESS',
    });
  }

  /**
   * Log payslip update
   */
  async logPayslipUpdate(
    payslipId: string,
    oldData: any,
    newData: any,
    actorId: string,
    actorRole: string,
  ) {
    const changes = this.buildChangesDescription(oldData, newData);
    return this.log({
      module: 'PAYSLIP',
      action: 'UPDATE',
      entityType: 'Payslip',
      entityId: payslipId,
      employeeId: oldData.employeeId || newData.employeeId,
      actorId,
      actorRole,
      oldData,
      newData,
      changes,
      status: 'SUCCESS',
    });
  }

  /**
   * Log payslip deletion
   */
  async logPayslipDelete(
    payslipId: string,
    payslipData: any,
    actorId: string,
    actorRole: string,
  ) {
    return this.log({
      module: 'PAYSLIP',
      action: 'DELETE',
      entityType: 'Payslip',
      entityId: payslipId,
      employeeId: payslipData.employeeId,
      actorId,
      actorRole,
      oldData: payslipData,
      changes: `Deleted payslip (gross: ${payslipData.gross}, net: ${payslipData.net})`,
      status: 'SUCCESS',
    });
  }

  /**
   * Log insurance creation
   */
  async logInsuranceCreate(
    insuranceId: string,
    insuranceData: any,
    actorId: string | undefined,
    actorRole: string,
  ) {
    return this.log({
      module: 'INSURANCE',
      action: 'CREATE',
      entityType: 'Insurance',
      entityId: insuranceId,
      employeeId: insuranceData.employeeId,
      actorId: actorId || undefined,
      actorRole,
      newData: insuranceData,
      changes: `Created insurance policy ${insuranceData.policyNumber} for employee ${insuranceData.employeeId}`,
      status: 'SUCCESS',
    });
  }

  /**
   * Log insurance update
   */
  async logInsuranceUpdate(
    insuranceId: string,
    oldData: any,
    newData: any,
    actorId: string | undefined,
    actorRole: string,
  ) {
    const changes = this.buildChangesDescription(oldData, newData);
    return this.log({
      module: 'INSURANCE',
      action: 'UPDATE',
      entityType: 'Insurance',
      entityId: insuranceId,
      employeeId: oldData.employeeId || newData.employeeId,
      actorId: actorId || undefined,
      actorRole,
      oldData,
      newData,
      changes,
      status: 'SUCCESS',
    });
  }

  /**
   * Log insurance deletion
   */
  async logInsuranceDelete(
    insuranceId: string,
    insuranceData: any,
    actorId: string | undefined,
    actorRole: string,
  ) {
    return this.log({
      module: 'INSURANCE',
      action: 'DELETE',
      entityType: 'Insurance',
      entityId: insuranceId,
      employeeId: insuranceData.employeeId,
      actorId: actorId || undefined,
      actorRole,
      oldData: insuranceData,
      changes: `Deleted insurance policy ${insuranceData.policyNumber} (coverage: ${insuranceData.coverageAmount})`,
      status: 'SUCCESS',
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters?: {
    module?: string;
    action?: string;
    entityType?: string;
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }) {
    const where: any = {};

    if (filters?.module) where.module = filters.module;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.employeeId) where.employeeId = filters.employeeId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = filters.startDate;
      if (filters?.endDate) where.createdAt.lte = filters.endDate;
    }

    const limit = filters?.limit || 100;
    const skip = filters?.skip || 0;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditTrail(entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Build a human-readable changes description
   */
  private buildChangesDescription(oldData: any, newData: any): string {
    const changes: string[] = [];

    if (!oldData || !newData) {
      return 'Data updated';
    }

    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of keys) {
      if (oldData[key] !== newData[key]) {
        changes.push(`${key}: ${oldData[key]} → ${newData[key]}`);
      }
    }

    return changes.length > 0
      ? changes.join(', ')
      : 'Data updated';
  }
}
