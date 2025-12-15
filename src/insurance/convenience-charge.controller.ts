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

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('convenience')
export class ConvenienceChargeController {
  constructor(
    private readonly convenienceChargeService: ConvenienceChargeService,
  ) {}

  /**
   * 🧾 Employee submits a convenience charge (creates in PENDING status)
   */
  @Roles('EMPLOYEE')
  @Post('submit')
  async submitCharge(
    @Body() dto: CreateConvenienceChargeDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
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
    const user = req.user as any;
    return this.convenienceChargeService.findByEmployeeId(
      employeeId,
      user.role,
      user.employeeId,
    );
  }

  /**
   * 📋 Get ALL PENDING charges (HR/Admin review list)
   */
  @Roles('ADMIN', 'HR')
  @Get('pending/all')
  async getPendingCharges() {
    return this.convenienceChargeService.getPendingCharges();
  }

  /**
   * 📋 Get charges by status (PENDING, APPROVED, REJECTED)
   */
  @Roles('ADMIN', 'HR')
  @Get('status/:status')
  async getChargesByStatus(
    @Param('status') status: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.convenienceChargeService.getChargesByStatus(status);
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
    const user = req.user as any;
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
    const user = req.user as any;
    return this.convenienceChargeService.approveCharge(
      chargeId,
      user.id,
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
    const user = req.user as any;
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

  /**
   * 🔄 Bulk approve/reject charges
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
    const user = req.user as any;
    return this.convenienceChargeService.bulkApproveCharges(
      user.id,
      body.charges,
      body.rejectionReasons,
    );
  }

  /**
   * 🧩 Employee bulk creates multiple charges at once
   * Format: { charges: [{title, amount, date}, {title, amount, date}] }
   */
  @Roles('EMPLOYEE')
  @Post('bulk-create')
  async bulkCreateCharges(
    @Body()
    body: { charges: Array<{ title: string; amount: number; date: string }> },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.convenienceChargeService.bulkCreateByEmployee(
      user.employeeId,
      body.charges,
    );
  }

  /**
   * [LEGACY] 📋 Get convenience charges for an employee
   */
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get(':employeeId')
  async findByEmployeeIdLegacy(
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;

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
      user.role,
      user.employeeId,
    );
  }
}
