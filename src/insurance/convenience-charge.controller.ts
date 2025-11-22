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
    constructor(private readonly convenienceChargeService: ConvenienceChargeService) {}
  
    /**
     * 🧾 Create a new convenience charge (ADMIN/HR only)
     */
    @Roles('ADMIN', 'HR')
    @Post()
    create(@Body() dto: CreateConvenienceChargeDto) {
      return this.convenienceChargeService.create(dto);
    }
  
    /**
     * 📋 Get convenience charges for an employee
     * ADMIN/HR can view any employee's charges
     * EMPLOYEE can only view their own charges
     */
    @Roles('ADMIN', 'HR', 'EMPLOYEE')
@Get(':employeeId')
async findByEmployeeId(@Param('employeeId') employeeId: string, @Req() req: Request) {
  const user = req.user as any;
  
 
  // If user is EMPLOYEE, they can only access their own data
  if (user.role === 'EMPLOYEE') {
    if (!user.employeeId) {
      throw new ForbiddenException('Employee ID not found in your session');
    }
    if (user.employeeId !== employeeId) {
      throw new ForbiddenException('You can only access your own convenience charges');
    }
  }

  return this.convenienceChargeService.findByEmployeeId(employeeId);
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
     * 🗑 Delete a convenience charge (ADMIN/HR only)
     */
    @Roles('ADMIN', 'HR')
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.convenienceChargeService.remove(id);
    }
  }