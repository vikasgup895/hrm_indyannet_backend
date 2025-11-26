// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */

// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   UseGuards,
//   Put,
//   Req,
//   UploadedFile,
//   UseInterceptors,
// } from '@nestjs/common';
// import { EmployeesService } from './employees.service';
// import { CreateEmployeeDto } from './dto/create-employee.dto';
// import { UpdateEmployeeDto } from './dto/update-employee.dto';
// import { AuthGuard } from '@nestjs/passport';
// import { Roles } from '../auth/roles.decorator';
// import { RolesGuard } from '../auth/roles.guard';
// import { ChangePasswordDto } from './dto/change-password.dto';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname } from 'path';

// @UseGuards(AuthGuard('jwt'), RolesGuard)
// @Controller('employees')
// export class EmployeesController {
//   constructor(private readonly svc: EmployeesService) {}

//   // ✅ 1. Basic info list (for dropdowns)
//   @Roles('ADMIN', 'HR')
//   @Get('basic')
//   getAllBasic() {
//     return this.svc.getAllBasic();
//   }

//   // ✅ 2. Full employee list
//   @Roles('ADMIN', 'HR', 'MANAGER')
//   @Get()
//   list() {
//     return this.svc.list();
//   }

//   // ✅ 3. Get current profile (based on logged-in user)
//   @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
//   @Get('profile/me')
//   getCurrentProfile(@Req() req: any) {
//     const userId = req.user.sub;
//     return this.svc.getCurrentProfile(userId);
//   }

//   // ✅ 4. Create new employee (supports new extended fields)
//   @Roles('ADMIN', 'HR')
//   @Post()
//   create(@Body() dto: CreateEmployeeDto) {
//     return this.svc.create(dto);
//   }

//   // ✅ 5. Upload Employee Documents
//   @Roles('ADMIN', 'HR')
//   @Post(':id/upload')
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//         destination: './uploads/employees',
//         filename: (req, file, cb) => {
//           const uniqueSuffix =
//             Date.now() + '-' + Math.round(Math.random() * 1e9);
//           const ext = extname(file.originalname);
//           cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
//         },
//       }),
//     }),
//   )
//   async uploadDocument(
//     @Param('id') id: string,
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     // Pass file path to service to link with Employee
//     return this.svc.addDocument(id, file.path);
//   }

//   // ✅ 6. Get employee by ID
//   @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
//   @Get(':id')
//   get(@Param('id') id: string) {
//     return this.svc.get(id);
//   }

//   // ✅ 7. Change password
//   @Roles('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')
//   @Put('change-password')
//   async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
//     const userId = req.user.sub;
//     return this.svc.changePassword(userId, dto);
//   }

//   // ✅ 8. Update employee (handles new fields like gender, address, etc.)
//   @Roles('ADMIN', 'HR')
//   @Put(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
//     return this.svc.update(id, dto);
//   }
// }
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
  Delete,
  Param,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import express from 'express';
import { PrismaService } from '../prisma.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly svc: EmployeesService,
    private readonly prisma: PrismaService,

  ) { }


  // ────────────────
  //  Change Password
  // ────────────────
  // Change Password 
  @Put("change-password")
  async changePassword(@Req() req, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
  
    if (!userId) {
      throw new BadRequestException("User ID missing from token");
    }
  
    return this.svc.changePassword(
      userId,
      body.oldPassword,
      body.newPassword
    );
  }
  



  // ────────────────
  // 1️⃣ Profile of Logged-in User
  // ────────────────
  @Get('profile/me')
  async getCurrentProfile(@Req() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    const userEmail = req.user?.email;
    const userRole = req.user?.role;
    // console.log('subid', req.user?.sub);
    // console.log('🟨 Logged-in User ID:', userId, '| Role:', userRole, '| Email:', userEmail);

    // 1️⃣ Try employee profile
    const employee = await this.svc.findByUserId(userId);
    if (employee) {
      // console.log('🟩 Found employee record');
      return employee;
    }

    // 2️⃣ Fallback for Admin/HR users using either ID or Email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { email: userEmail }],
      },
      select: { id: true, email: true, role: true },
    });

    // console.log('🟦 Found user record:', user);

    // 3️⃣ Build default admin profile
    if (user && (user.role === 'ADMIN' || user.role === 'HR')) {
      // console.log('🟢 Returning default admin profile');
      return {
        id: user.id,
        firstName: 'Admin',
        lastName: '',
        workEmail: user.email,
        department: 'Administration',
        status: 'Active',
        hireDate: null,
        user,
      };
    }

    // console.log('❌ Profile not found for user:', userId);
    throw new NotFoundException('Profile not found');
  }



  // ────────────────
  // 2️⃣ Update current user's profile
  // ────────────────
  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateEmployeeDto) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) throw new NotFoundException('User not found');

    const employee = await this.svc.findByUserId(userId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.svc.update(employee.id, dto, req.user);
  }


  // ────────────────
  // 3️⃣ List Employees
  // ────────────────
  @Get()
  async list() {
    return this.svc.list();
  }

  // ────────────────
  // 4️⃣ Get Employee by ID
  // ────────────────
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  // ────────────────
  // 5️⃣ Create New Employee
  // ────────────────
  @Roles('ADMIN', 'HR')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateEmployeeDto) {
    return this.svc.create(dto, req.user);
  }


  // ────────────────
  // 6️⃣ Update Employee by ID (admin/hr)
  // ────────────────
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() req: any) {
    return this.svc.update(id, dto, req.user);
  }

  // ────────────────
  // 7️⃣ Upload Employee Document
  // ────────────────
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/employees',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const original = file.originalname.replace(/\s+/g, '-');
          cb(null, `${uniqueSuffix}-${original}`);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    // 🛑 EMPLOYEE SECURITY CHECK (VERY IMPORTANT)
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId !== id) {
      throw new ForbiddenException(
        'Employees can only upload documents for themselves',
      );
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadedBy = req.user?.email ?? 'system';
    const result = await this.svc.addDocument(id, file.path, uploadedBy);

    return {
      message: 'Document uploaded successfully',
      document: result,
    };
  }




  @Delete(':id')
  async deleteEmployee(@Param('id') id: string) {
    return this.svc.deleteEmployee(id);
  }


  // ────────────────
  // 8️⃣ Basic List
  // ────────────────
  @Get('basic/all')
  async getAllBasic() {
    return this.svc.getAllBasic();
  }

  
  

}
