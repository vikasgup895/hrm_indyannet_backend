/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Prisma, Employee, Role } from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  CreateBankDetailDto,
  UpdateBankDetailDto,
} from './dto/bank-detail.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ────────────────
  // 1️⃣ List All Employees
  // ────────────────
  async list(): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        bankDetail: true,
        compensation: true,
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ────────────────
  // 2️⃣ Get Employee by ID
  // ────────────────
  async get(id: string): Promise<Employee | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        bankDetail: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        compensation: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  // ────────────────
  // 3️⃣ Create Employee
  // ────────────────
  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const personNo = await this.generatePersonNo();

    const user = await this.prisma.user.create({
      data: {
        email: dto.workEmail,
        passwordHash: await this.hashPassword(
          process.env.DEFAULT_EMPLOYEE_PASSWORD || 'password123',
        ),
        role: 'EMPLOYEE',
      },
    });

    return this.prisma.employee.create({
      data: {
        personNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        workEmail: dto.workEmail,
        personalEmail: dto.personalEmail ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        department: dto.department ?? null,
        location: dto.location ?? null,
        status: dto.status || 'Active',
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        managerId: dto.managerId ?? null,
        userId: user.id,
      },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

 
// 4️⃣ Update Employee or Self (Fixed Bank Detail Handling)
// ────────────────
async update(
  id: string,
  dto: UpdateEmployeeDto,
  currentUser?: any,
): Promise<Employee> {
  const employee = await this.prisma.employee.findUnique({
    where: { id },
    include: { bankDetail: true },
  });

  if (!employee) throw new NotFoundException('Employee not found');

  const role = currentUser?.role ?? null;
  const isAdminOrHR =
    role === Role.ADMIN || role === 'ADMIN' || role === 'HR';
  const isOwner =
    currentUser?.employeeId === id || currentUser?.id === employee.userId;

  if (!isAdminOrHR && !isOwner) {
    throw new ForbiddenException('Not authorized to update this profile');
  }

  // ✅ Normalize flat bank fields into dto.bankDetail
  if (!(dto as any).bankDetail) {
    const bankKeys = [
      'bankName',
      'accountHolder',
      'accountNumber',
      'ifscCode',
      'branch',
      'branchName',
      'pfNumber',
      'uan',
      'uanNumber',
    ];
    const hasBankData = bankKeys.some((k) => (dto as any)[k] !== undefined);
    if (hasBankData) {
      (dto as any).bankDetail = {
        bankName: (dto as any).bankName,
        accountHolder:
          (dto as any).accountHolder ??
          `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        accountNumber: (dto as any).accountNumber,
        ifscCode: (dto as any).ifscCode,
        branch: (dto as any).branch || (dto as any).branchName,
        pfNumber: (dto as any).pfNumber,
        uan: (dto as any).uan || (dto as any).uanNumber,
      };
    }
  //  console.log("🟦 Normalized bankDetail object:", (dto as any).bankDetail); // ✅ Add this
  }

  // ✅ Handle bank detail upsert
  // employees.service.ts (inside update method)
  if (dto.bankDetail) {
    const bd = dto.bankDetail;
   // console.log('🟩 Upserting bankDetail for employee:', id);
  
    await this.prisma.bankDetail.upsert({
      where: { employeeId: id },
      create: {
        employee: { connect: { id } }, // ✅ Connect relation
        bankName: bd.bankName!,
        accountHolder:
          bd.accountHolder ??
          `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        accountNumber: bd.accountNumber!,
        ifscCode: bd.ifscCode!,
        branch: bd.branch ?? null,
        pfNumber: bd.pfNumber ?? null,
        uan: bd.uan ?? null,
      },
      update: {
        bankName: bd.bankName ?? undefined,
        accountHolder: bd.accountHolder ?? undefined,
        accountNumber: bd.accountNumber ?? undefined,
        ifscCode: bd.ifscCode ?? undefined,
        branch: bd.branch ?? undefined,
        pfNumber: bd.pfNumber ?? undefined,
        uan: bd.uan ?? undefined,
      },
    });
  
    delete (dto as any).bankDetail;
  }
  

  // ✅ Update employee main record
  const updatedEmployee = await this.prisma.employee.update({
    where: { id },
    data: dto as Prisma.EmployeeUpdateInput,
    include: {
      manager: { select: { id: true, firstName: true, lastName: true } },
      bankDetail: true,
      user: { select: { id: true, email: true, role: true } },
    },
  });

  return updatedEmployee;
}


  // ────────────────
  // 5️⃣ Find Employee by User ID
  // ────────────────
  async findByUserId(userId: string) {
    return this.prisma.employee.findUnique({
      where: { userId },
      include: {
        bankDetail: true,
        documents: true,
        compensation: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, email: true, role: true } },
      },
    });
  }

  // ────────────────
  // 6️⃣ Add Document
  // ────────────────
  async addDocument(employeeId: string, filePath: string, uploadedBy?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const fileName = filePath.split('/').pop() ?? filePath;
    const ext = fileName.split('.').pop() ?? '';

    const document = await this.prisma.document.create({
      data: {
        employeeId,
        title: fileName,
        type: ext,
        storageUrl: filePath,
        uploadedBy: uploadedBy ?? 'System',
      },
    });

    return { message: 'Document uploaded and linked successfully', document };
  }

  // ────────────────
  // 7️⃣ Generate Employee Code
  // ────────────────
  private async generatePersonNo(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `EMP${(10000 + count + 1).toString().slice(1)}`;
  }

  // ────────────────
  // 8️⃣ Basic List for Dropdowns
  // ────────────────
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
