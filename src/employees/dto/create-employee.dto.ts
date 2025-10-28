// src/employees/dto/create-employee.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  IsNumberString,
} from 'class-validator';

export enum EmployeeStatusDto {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum GenderDto {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export class CreateEmployeeDto {
  // --- Personal Information ---
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  workEmail: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string; // ✅ NEW

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string; // ✅ NEW

  @IsOptional()
  @IsString()
  address?: string; // ✅ NEW

  @IsOptional()
  @IsString()
  educationQualification?: string; // ✅ NEW

  @IsOptional()
  @IsEnum(GenderDto)
  gender?: GenderDto; // ✅ NEW

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(EmployeeStatusDto)
  status?: EmployeeStatusDto;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string; // ✅ NEW (uploaded doc URL or path)

  // --- Compensation ---
  @IsOptional()
  @IsNumberString()
  salary?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // --- (Optional Extra Payroll Fields — keep if you plan to use later) ---
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  pfEsi?: string;
}
