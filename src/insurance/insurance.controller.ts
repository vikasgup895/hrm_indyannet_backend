/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { UpdateFinancialDto } from './dto/update-financial.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /**
   * 🧾 Create a new insurance record (ADMIN/HR only)
   */
  @Roles('ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateInsuranceDto) {
    return this.insuranceService.create(dto);
  }

  /**
   * 📋 Get all insurance records (ADMIN/HR) or own (EMPLOYEE)
   */
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get()
  async findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.insuranceService.findAll(user.role, user.employeeId);
  }

  /**
   * � List insurance documents (ADMIN/HR/EMPLOYEE)
   * - Filter by employeeId or insuranceId (policy number)
   * - Employees only see their own documents
   * NOTE: Placed BEFORE dynamic :id route to prevent it being captured as an id.
   */
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get('docs')
  async listDocuments(
    @Query('employeeId') employeeId: string,
    @Query('insuranceId') insuranceId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.insuranceService.listDocuments({
      employeeId,
      insuranceId,
      requesterRole: user.role,
      requesterEmployeeId: user.employeeId,
    });
  }

  /**
   * � Delete an insurance document (ADMIN/HR only)
   * NOTE: Placed before dynamic :id route.
   */
  @Roles('ADMIN', 'HR')
  @Delete('docs/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.insuranceService.deleteDocument(id);
  }

  /**
   * ��👤 Get logged-in employee’s insurance record
   */
  @Roles('EMPLOYEE')
  @Get('my')
  async getMyInsurance(@Req() req: Request) {
    const user = req.user as any;
    return this.insuranceService.findAll('EMPLOYEE', user.employeeId);
  }

  /**
   * 🔍 Get a specific insurance record by ID (ADMIN/HR/EMPLOYEE)
   */
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insuranceService.findOne(id);
  }

  /**
   * 🧩 Update a specific insurance record (ADMIN/HR only)
   */
  @Roles('ADMIN', 'HR')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.insuranceService.update(id, dto);
  }

  /**
   * 💰 Update financial data (bonus, convenience fee, etc)
   * ADMIN/HR can update any record
   */
  @Roles('ADMIN', 'HR')
  @Put(':id/financial')
  updateFinancial(@Param('id') id: string, @Body() dto: UpdateFinancialDto) {
    return this.insuranceService.updateFinancial(id, dto);
  }

  /**
   * 💸 Employee e-cash claim — secure self-update
   */
  @Roles('EMPLOYEE')
  @Put(':id/ecash')
  async employeeEcashClaim(
    @Param('id') id: string,
    @Body() dto: UpdateFinancialDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;

    // Validate that this insurance belongs to the logged-in employee
    const insurance = await this.insuranceService.findOne(id);
    if (insurance.employeeId !== user.employeeId) {
      throw new ForbiddenException('You can only claim your own insurance');
    }

    // Allow updating only eCashAmount and convenienceFee
    return this.insuranceService.updateFinancial(id, {
      eCashAmount: dto.eCashAmount,
      convenienceFee: dto.convenienceFee,
    });
  }

  /**
   * 🗑 Delete an insurance record (ADMIN/HR only)
   */
  @Roles('ADMIN', 'HR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insuranceService.remove(id);
  }

  /**
   * 📎 Upload insurance-related document (ADMIN/HR)
   * Stores file under uploads/insurance and records in Document table
   */
  @Roles('ADMIN', 'HR')
  @Post('docs')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/insurance',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('employeeId') employeeId: string,
    @Body('insuranceId') insuranceId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.insuranceService.uploadDocument({
      employeeId,
      insuranceId,
      storageUrl: file ? `/uploads/insurance/${file.filename}` : undefined,
      originalName: file?.originalname,
      uploadedBy: user?.id,
    });
  }
}
