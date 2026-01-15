import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogService } from './audit-log.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private auditLog: AuditLogService) {}

  /**
   * Get audit logs (Admin/HR only - for internal use only)
   * Not exposed to client, kept hidden
   */
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get()
  async getAuditLogs(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit: string = '100',
    @Query('skip') skip: string = '0',
  ) {
    return this.auditLog.getAuditLogs({
      module,
      action,
      entityType,
      employeeId,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
  }

  /**
   * Get complete audit trail for a specific entity
   * Shows all changes to a payslip or insurance record
   */
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('trail/:entityId')
  async getEntityTrail(@Param('entityId') entityId: string) {
    return this.auditLog.getEntityAuditTrail(entityId);
  }

  /**
   * Get all payslip logs
   */
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('payslips')
  async getPayslipLogs(
    @Query('limit') limit: string = '100',
    @Query('skip') skip: string = '0',
  ) {
    return this.auditLog.getAuditLogs({
      module: 'PAYSLIP',
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
  }

  /**
   * Get all insurance logs
   */
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('insurance')
  async getInsuranceLogs(
    @Query('limit') limit: string = '100',
    @Query('skip') skip: string = '0',
  ) {
    return this.auditLog.getAuditLogs({
      module: 'INSURANCE',
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
  }

  /**
   * Get employee-specific logs
   */
  @Roles('HR', 'ADMIN', 'MD', 'CAO')
  @Get('employee/:employeeId')
  async getEmployeeLogs(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit: string = '100',
    @Query('skip') skip: string = '0',
  ) {
    return this.auditLog.getAuditLogs({
      employeeId,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
  }
}
