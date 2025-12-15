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
import { MailerService } from '../mailer/mailer.service'; // << ADD THIS

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
     private readonly mailer: MailerService
    ) { }

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
async create(dto: CreateEmployeeDto, currentUser?: any): Promise<Employee> {

  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.workEmail },
  });
  
  if (existingUser) {
    throw new BadRequestException('A user with this email already exists');
  }
  const personNo = await this.generatePersonNo();

  // 1. Create User Login
  const user = await this.prisma.user.create({
    data: {
      email: dto.workEmail,
      passwordHash: await this.hashPassword(
        process.env.DEFAULT_EMPLOYEE_PASSWORD || 'password123',
      ),
      role: dto.role || Role.EMPLOYEE,   // ✔️ Use selected role (enum)
    },
  });
  
  // Only ADMIN can create HR
  if (dto.role === Role.HR && currentUser?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admin can create HR accounts');
  }
  
  // Only ADMIN can create ADMIN
  if (dto.role === Role.ADMIN && currentUser?.role !== Role.ADMIN) {
    throw new ForbiddenException('Only admin can create admin accounts');
  }

  
    // 2. Create Employee Record (saving ALL fields)
    const employee = await this.prisma.employee.create({
      data: {
        personNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        workEmail: dto.workEmail,
  
        // 🔥 THESE FIELDS WERE NOT SAVED BEFORE — FIXED NOW
        personalEmail: dto.personalEmail ?? null,
        phone: dto.phone ?? null,
        emergencyContact: dto.emergencyContact ?? null,
        gender: dto.gender ?? null,
        address: dto.address ?? null,
        educationQualification: dto.educationQualification ?? null,
        designation: dto.designation ?? null,

        birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
  
        department: dto.department ?? null,
        location: dto.location ?? null,
        status: dto.status ?? 'Active',
  
        managerId: dto.managerId ?? null,
        userId: user.id,
      },
    });
  
    // 3. Send Email After Creation
    await this.mailer.send(
      dto.workEmail,
      'Welcome to Indyanet HRM – Your Account Credentials',
      `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <div style="text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="color: #2b6cb0; margin: 0;">Indyanet HRM</h2>
          <p style="margin: 4px 0; font-size: 14px; color: #666;">Human Resource Management System</p>
        </div>
  
        <p>Dear <strong>${dto.firstName}</strong>,</p>
  
        <p>Welcome to <strong>Indyanet HRM</strong>! Your employee account has been successfully created. Please find your login credentials below:</p>
  
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; background: #f8f9fa; border: 1px solid #ddd;"><strong>Login Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dto.workEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f8f9fa; border: 1px solid #ddd;"><strong>Temporary Password</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${process.env.DEFAULT_EMPLOYEE_PASSWORD}</td>
          </tr>
        </table>
  
        <p>
          You can log in to your HRM portal here:<br/>
          <a href="https://hrm.indyanet.com" style="color: #2b6cb0; text-decoration: none; font-weight: bold;">
            https://hrm.indyanet.com
          </a>
        </p>
  
        <p><strong>Important:</strong> Please change your password immediately after your first login.</p>
  
        <p>We’re glad to have you on board. If you face any issues accessing your account, contact the HR department.</p>
  
        <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 10px; font-size: 13px; color: #777;">
          <p style="margin: 0;">Best Regards,<br/>
          <strong>HR Team</strong><br/>
          Indyanet HRM</p>
          <p style="margin-top: 6px; color: #999;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
      `
    );
  
    return employee;
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
  
    //
    // ───────────────────────────────────────────────
    // NORMALIZE DATE FIELDS (Convert to ISO-8601 DateTime)
    // ───────────────────────────────────────────────
    //
    if (dto.birthdate && typeof dto.birthdate === 'string') {
      // If it's a date string like "2000-01-15", convert to ISO DateTime
      if (!dto.birthdate.includes('T')) {
        dto.birthdate = new Date(dto.birthdate).toISOString();
      }
    }

    //
    // ───────────────────────────────────────────────
    // NORMALIZE BANK DETAIL FIELDS
    // ───────────────────────────────────────────────
    //
    if (!dto.bankDetail) {
      const bankKeys = [
        'bankName',
        'accountNumber',
        'ifscCode',
        'branch',
        'branchName',
        'pfNumber',
        'uan',
        'uanNumber',
      ];
  
      const hasBankFields = bankKeys.some((k) => (dto as any)[k] !== undefined);
  
      if (hasBankFields) {
        dto.bankDetail = {
          bankName: (dto as any).bankName,
          accountNumber: (dto as any).accountNumber,
          ifscCode: (dto as any).ifscCode,
          branch: (dto as any).branch || (dto as any).branchName,
          pfNumber: (dto as any).pfNumber,
          uan: (dto as any).uan || (dto as any).uanNumber,
          accountHolder:
            employee.firstName && employee.lastName
              ? `${employee.firstName} ${employee.lastName}`
              : undefined,
        };
      }
    }
  
    //
    // ───────────────────────────────────────────────
    // HANDLE BANKDETAIL UPSERT
    // ───────────────────────────────────────────────
    //
    if (dto.bankDetail) {
      const bd = dto.bankDetail;
  
      await this.prisma.bankDetail.upsert({
        where: { employeeId: id },
        create: {
          employee: { connect: { id } },
          bankName: bd.bankName ?? "",
          accountNumber: bd.accountNumber ?? "",
          ifscCode: bd.ifscCode ?? "",
          branch: bd.branch ?? null,
          pfNumber: bd.pfNumber ?? null,
          uan: bd.uan ?? null,
          accountHolder:
            bd.accountHolder ??
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        },
        update: {
          bankName: bd.bankName ?? undefined,
          accountNumber: bd.accountNumber ?? undefined,
          ifscCode: bd.ifscCode ?? undefined,
          branch: bd.branch ?? undefined,
          pfNumber: bd.pfNumber ?? undefined,
          uan: bd.uan ?? undefined,
          accountHolder:
            bd.accountHolder ??
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        },
      });
  
      delete (dto as any).bankDetail;
    }
  
    //
    // ───────────────────────────────────────────────
    // PREVENT EMPLOYEE (NON-HR) FROM UPDATING LOCKED FIELDS
    // ───────────────────────────────────────────────
    //
    if (!isAdminOrHR) {
      delete dto.firstName;
      delete dto.lastName;
      delete dto.workEmail;
      delete dto.department;
      delete dto.status;  // Employees cannot change status
      delete dto.designation;   // ⭐ Employee cannot update designation
    }
  
    //
    // ───────────────────────────────────────────────
    // UPDATE EMPLOYEE
    // ───────────────────────────────────────────────
    //
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
  
  async deleteEmployee(id: string) {

    // 🔥 1. Remove manager assignments (clear managerId on subordinates)
    await this.prisma.employee.updateMany({
      where: { managerId: id },
      data: { managerId: null },
    });
  
    // 🔥 2. Delete 1:1 relations
    await this.prisma.bankDetail.deleteMany({ where: { employeeId: id } });
    await this.prisma.compensation.deleteMany({ where: { employeeId: id } });
  
    // 🔥 3. Delete 1:N relations
    await this.prisma.document.deleteMany({ where: { employeeId: id } });
    await this.prisma.insurance.deleteMany({ where: { employeeId: id } });
    await this.prisma.leaveBalance.deleteMany({ where: { employeeId: id } });
    await this.prisma.leaveRequest.deleteMany({ where: { employeeId: id } });
    await this.prisma.attendanceRecord.deleteMany({
      where: { employeeId: id },
    });
    await this.prisma.payslip.deleteMany({ where: { employeeId: id } });
  
    // 🔥 4. Delete User record if exists
    await this.prisma.user.deleteMany({
      where: { employee: { id } },
    });
  
    // 🔥 5. Delete employee
    return await this.prisma.employee.delete({
      where: { id },
    });
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
  async addDocument(
    employeeId: string,
    filePath: string,
    uploadedBy?: string,
  ) {
    // 1️⃣ Confirm employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
  
    // 2️⃣ Extract file info
    const fileName = filePath.split('/').pop() ?? filePath;
    const ext = fileName.split('.').pop() ?? '';
  
    // Normalize storage path (remove leading "./")
    const normalizedPath = filePath.replace(/^\.?\//, '');
  
    // 3️⃣ Save document entry
    const document = await this.prisma.document.create({
      data: {
        employeeId,
        title: fileName,
        type: ext,
        storageUrl: normalizedPath,   // <-- stores clean path
        uploadedBy: uploadedBy ?? 'System',
      },
    });
  
    // 4️⃣ Return clean response
    return {
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        type: document.type,
        url: normalizedPath,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
      },
    };
  }
  

  // ────────────────
  // 7️⃣ Generate Employee Code
  // ────────────────
  private async generatePersonNo(): Promise<string> {
    // 1️⃣ Get the highest existing employee number
    const lastEmployee = await this.prisma.employee.findFirst({
      orderBy: { personNo: 'desc' },  // EMP9999 > EMP0001 alphabetically
      select: { personNo: true },
    });
  
    let lastNum = 0;
  
    if (lastEmployee?.personNo) {
      const digits = lastEmployee.personNo.replace("EMP", "");
      lastNum = parseInt(digits, 10);
    }
  
    // 2️⃣ Generate next valid ID
    while (true) {
      lastNum++;
  
      const num = lastNum.toString().padStart(4, "0");
      const empNo = `EMP${num}`;
  
      // Condition 1: Must NOT contain digit "8"
      if (num.includes("8")) continue;
  
      // Condition 2: Sum of digits must NOT equal 8
      const sum = num.split("").reduce((acc, d) => acc + Number(d), 0);
      if (sum === 8) continue;
  
      return empNo;
    }
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
        status:true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const matches = await bcrypt.compare(oldPassword, user.passwordHash);
  
    if (!matches) {
      throw new ForbiddenException('Old password is incorrect');
    }
  
    const newHash = await bcrypt.hash(newPassword, 10);
  
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  
    return { message: 'Password updated successfully' };
  }
  

   
      
}
