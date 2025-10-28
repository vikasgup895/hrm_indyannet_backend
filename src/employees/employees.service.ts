// src/employees/employees.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Prisma, Employee } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async list(): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      include: {
        compensation: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        compensation: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: true,
      },
    });
  }

  // async getCurrentProfile(userId: string): Promise<Employee | null> {
  //   return this.prisma.employee.findFirst({
  //     where: { userId },
  //     include: {
  //       compensation: true,
  //       manager: { select: { id: true, firstName: true, lastName: true } },
  //       user: { select: { email: true, role: true } },
  //     },
  //   });
  // }
  async getCurrentProfile(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        compensation: true,
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { email: true, role: true },
        },
      },
    });

    // ✅ If not found (e.g., admin), return user info only
    if (!employee) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, createdAt: true },
      });

      return {
        message: 'No employee profile found — returning user info',
        user,
      };
    }

    return employee;
  }

  async changePassword(
    userId: string,
    dto: { oldPassword: string; newPassword: string },
  ) {
    // Step 1: Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Step 2: Verify old password
    const isValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Old password is incorrect');
    }

    // Step 3: Hash new password
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // Step 4: Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  // async create(dto: CreateEmployeeDto): Promise<Employee> {
  //   const personNo = await this.generatePersonNo();

  //   return this.prisma.employee.create({
  //     data: {
  //       personNo,
  //       firstName: dto.firstName,
  //       lastName: dto.lastName,
  //       workEmail: dto.workEmail,
  //       phone: dto.phone ?? null,
  //       department: dto.department ?? null,
  //       location: dto.location ?? null,
  //       status: dto.status || 'Active',
  //       hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
  //       managerId: dto.managerId ?? null,
  //       compensation: dto.salary
  //         ? {
  //             create: {
  //               baseSalary: parseFloat(dto.salary),
  //               currency: dto.currency || 'INR',
  //               effectiveOn: new Date(),
  //             },
  //           }
  //         : undefined,
  //     },
  //     include: {
  //       compensation: true,
  //       manager: { select: { id: true, firstName: true, lastName: true } },
  //     },
  //   });
  // }

  // src/employees/employees.service.ts
  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const personNo = await this.generatePersonNo();

    // ✅ Step 1: Create linked User account automatically
    const user = await this.prisma.user.create({
      data: {
        email: dto.workEmail,
        passwordHash: await this.hashPassword(
          process.env.DEFAULT_EMPLOYEE_PASSWORD || 'password123',
        ),
        role: 'EMPLOYEE',
      },
    });

    // ✅ Step 2: Create Employee and link to User
    const employee = await this.prisma.employee.create({
      data: {
        // personNo,
        // firstName: dto.firstName,
        // lastName: dto.lastName,
        // workEmail: dto.workEmail,
        // phone: dto.phone ?? null,
        // birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
        // department: dto.department ?? null,
        // location: dto.location ?? null,
        // status: dto.status || 'Active',
        // hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        // managerId: dto.managerId ?? null,
        // userId: user.id, // ✅ Link Employee to User

        personNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        workEmail: dto.workEmail,
        personalEmail: dto.personalEmail ?? null, // ✅ NEW
        phone: dto.phone ?? null,
        emergencyContact: dto.emergencyContact ?? null, // ✅ NEW
        address: dto.address ?? null, // ✅ NEW
        educationQualification: dto.educationQualification ?? null, // ✅ NEW
        gender: dto.gender ?? null, // ✅ NEW
        // documentUrl: dto.documentUrl ?? null, // ✅ NEW
        birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
        department: dto.department ?? null,
        location: dto.location ?? null,
        status: dto.status || 'Active',
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        managerId: dto.managerId ?? null,
        userId: user.id,

        compensation: dto.salary
          ? {
              create: {
                baseSalary: parseFloat(dto.salary),
                currency: dto.currency || 'INR',
                effectiveOn: new Date(),
              },
            }
          : undefined,
      },
      include: {
        compensation: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
    });

    return employee;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    return this.prisma.employee.update({
      where: { id },
      data: dto as Prisma.EmployeeUpdateInput,
      include: {
        compensation: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addDocument(employeeId: string, filePath: string, uploadedBy?: string) {
    // Step 1: Validate that employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Step 2: Extract file info
    const fileName = filePath.split('/').pop() ?? 'employee_doc';
    const fileExt = fileName.split('.').pop() ?? 'unknown';

    // Step 3: Create Document entry
    const document = await this.prisma.document.create({
      data: {
        employeeId,
        title: fileName,
        type: fileExt,
        storageUrl: filePath, // ✅ local path; replace with S3 URL if needed
        uploadedBy: uploadedBy ?? 'System',
      },
    });

    return {
      message: 'Document uploaded and linked successfully',
      document,
    };
  }

  private async generatePersonNo(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `E-${String(count + 1).padStart(4, '0')}`;
  }

  // ✅ Simple clean list for dropdowns and HR modules
  async getAllBasic() {
    return this.prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        workEmail: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
