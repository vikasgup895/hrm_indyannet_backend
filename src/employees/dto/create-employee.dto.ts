// src/employees/dto/create-employee.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  IsNumberString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBankDetailDto } from './bank-detail.dto';
import { Role } from '@prisma/client';

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
  // --- Basic / Personal ---

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  workEmail: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  educationQualification?: string;

  @IsOptional()
  @IsEnum(GenderDto)
  gender?: GenderDto;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // ⭐ NEW FIELD ADDED HERE
  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(EmployeeStatusDto)
  status?: EmployeeStatusDto;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  // --- Bank Details ---
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankDetailDto)
  bankDetails?: CreateBankDetailDto[];
}
