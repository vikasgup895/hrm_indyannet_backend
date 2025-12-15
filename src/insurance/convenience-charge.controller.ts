import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ConvenienceChargeService } from './convenience-charge.service';
import { CreateConvenienceChargeDto } from './dto/create-convenience-charge.dto';
import { UpdateConvenienceChargeDto } from './dto/update-convenience-charge.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { Request } from 'express';

/**
 * Normalized user object from JWT payload
 * Ensures consistent access to user identity across all endpoints
 */
interface NormalizedUser {
  sub: string; // User ID from JWT
  employeeId: string; // Employee record ID (linked via employee.userId)
  role: 'EMPLOYEE' | 'HR' | 'ADMIN';
  email?: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('convenience')
export class ConvenienceChargeController {
  constructor(
    private readonly convenienceChargeService: ConvenienceChargeService,
  ) {}

  /**
   * Extract and normalize user from request
   * Ensures req.user always has consistent structure
   */
  private normalizeUser(req: Request): NormalizedUser {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }
    if (!user.employeeId) {
      throw new ForbiddenException('Employee ID not found in session');
    }
    return {
      sub: user.sub as string,
      employeeId: user.employeeId as string,
      role: (user.role as 'EMPLOYEE' | 'HR' | 'ADMIN') || 'EMPLOYEE',
      email: user.email as string | undefined,
    };
  }

  /**
   * 📋 Get ALL PENDING charges (HR/Admin review list)
   * ✅ MUST be before @Get(':id') to prevent route collision
   */
  @Roles('ADMIN', 'HR')
  @Get('pending/all')
  async getPendingCharges() {
    return this.convenienceChargeService.getPendingCharges();
  }

  /**
   * 📋 Get charges by status (PENDING, APPROVED, REJECTED)
   * ✅ MUST be before @Get(':id') to prevent route collision
   */
  @Roles('ADMIN', 'HR')
  @Get('status/:status')
  async getChargesByStatus(
    @Param('status') status: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.convenienceChargeService.getChargesByStatus(status);
  }

  /**
   * 🧾 Employee submits a convenience charge (creates in PENDING status)
   */
  @Roles('EMPLOYEE')
  @Post('submit')
  async submitCharge(
    @Body() dto: CreateConvenienceChargeDto,
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.createByEmployee(user.employeeId, dto);
  }

  /**
   * 📋 Get convenience charges for an employee
   * EMPLOYEE: own charges only
   * ADMIN/HR: any employee's charges
   */
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get('employee/:employeeId')
  async findByEmployeeId(
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.findByEmployeeId(
      employeeId,
      user.role,
      user.employeeId,
    );
  }

  /**
   * ✏️ Employee updates own PENDING charge
   */
  @Roles('EMPLOYEE')
  @Put('my/:chargeId')
  async updateOwnCharge(
    @Param('chargeId') chargeId: string,
    @Body() dto: UpdateConvenienceChargeDto,
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.updateByEmployee(
      chargeId,
      user.employeeId,
      dto,
    );
  }

  /**
   * ✅ HR/Admin approves or rejects a charge
   */
  @Roles('ADMIN', 'HR')
  @Put('approve/:chargeId')
  async approveCharge(
    @Param('chargeId') chargeId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.approveCharge(
      chargeId,
      user.sub,
      body.status,
      body.rejectionReason,
    );
  }

  /**
   * 🗑 Employee deletes own PENDING charge
   */
  @Roles('EMPLOYEE')
  @Delete('my/:chargeId')
  async deleteOwnCharge(
    @Param('chargeId') chargeId: string,
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.removeByEmployee(
      chargeId,
      user.employeeId,
    );
  }

  /**
   * 🗑 HR/Admin deletes any charge (usually only PENDING)
   */
  @Roles('ADMIN', 'HR')
  @Delete(':chargeId')
  async deleteCharge(@Param('chargeId') chargeId: string) {
    return this.convenienceChargeService.remove(chargeId);
  }

  /**
   * [LEGACY] 🧾 Create a new convenience charge (ADMIN/HR only)
   */
  @Roles('ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateConvenienceChargeDto) {
    return this.convenienceChargeService.create(dto);
  }

  /**

   * � Bulk approve/reject charges (MUST be before @Put(':id'))
   * Format: { chargeId1: 'APPROVED', chargeId2: 'REJECTED', ... }
   * With optional rejectionReasons: { chargeId2: 'Insufficient proof', ... }
   */
  @Roles('ADMIN', 'HR')
  @Put('bulk/approve-reject')
  async bulkApproveCharges(
    @Body()
    body: {
      charges: Record<string, 'APPROVED' | 'REJECTED'>;
      rejectionReasons?: Record<string, string>;
    },
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.bulkApproveCharges(
      user.sub,
      body.charges,
      body.rejectionReasons,
    );
  }

  /**
   * 🧩 Employee bulk creates multiple charges at once (MUST be before @Post())
   * Format: { charges: [{title, amount, date}, {title, amount, date}] }
   */
  @Roles('EMPLOYEE')
  @Post('bulk-create')
  async bulkCreateCharges(
    @Body()
    body: { charges: Array<{ title: string; amount: number; date: string }> },
    @Req() req: Request,
  ) {
    const user = this.normalizeUser(req);
    return this.convenienceChargeService.bulkCreateByEmployee(
      user.employeeId,
      body.charges,
    );
  }

  /**
   * 🔍 Get a specific convenience charge by ID
   */
  @Roles('ADMIN', 'HR')
  @Get('charge/:id')
  findOne(@Param('id') id: string) {
    return this.convenienceChargeService.findOne(id);
  }

  /**
   * 🧩 Update a convenience charge (ADMIN/HR only)
   */
  @Roles('ADMIN', 'HR')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConvenienceChargeDto) {
    return this.convenienceChargeService.update(id, dto);
  }

  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get(':employeeId')
  async findByEmployeeIdLegacy(
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ) {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // If user is EMPLOYEE, they can only access their own data
    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) {
        throw new ForbiddenException('Employee ID not found in your session');
      }
      if (user.employeeId !== employeeId) {
        throw new ForbiddenException(
          'You can only access your own convenience charges',
        );
      }
    }

    return this.convenienceChargeService.findByEmployeeId(
      employeeId,
      user.role as 'EMPLOYEE' | 'HR' | 'ADMIN',
      user.employeeId as string,
    );
  }
}
