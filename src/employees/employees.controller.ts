/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  // ✅ 1. Basic info list (for dropdowns)
  @Roles('ADMIN', 'HR')
  @Get('basic')
  getAllBasic() {
    return this.svc.getAllBasic();
  }

  // ✅ 2. Full employee list
  @Roles('ADMIN', 'HR', 'MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  // ✅ 3. Get current profile (based on logged-in user)
  @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
  @Get('profile/me')
  getCurrentProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.svc.getCurrentProfile(userId);
  }

  // ✅ 4. Create new employee (supports new extended fields)
  @Roles('ADMIN', 'HR')
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.svc.create(dto);
  }

  // ✅ 5. Upload Employee Documents
  @Roles('ADMIN', 'HR')
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/employees',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Pass file path to service to link with Employee
    return this.svc.addDocument(id, file.path);
  }

  // ✅ 6. Get employee by ID
  @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  // ✅ 7. Change password
  @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
  @Put('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const userId = req.user.sub;
    return this.svc.changePassword(userId, dto);
  }

  // ✅ 8. Update employee (handles new fields like gender, address, etc.)
  @Roles('ADMIN', 'HR')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.svc.update(id, dto);
  }
}
