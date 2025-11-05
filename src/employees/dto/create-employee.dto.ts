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
  // NOTE: personNo is intentionally NOT present here — backend will generate it

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

  @IsOptional()
  @IsEnum(EmployeeStatusDto)
  status?: EmployeeStatusDto;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  // --- Compensation ---
  // If you want admins to be able to send salary at creation, add salary/currency here.
  // For now we keep them out because your service may create Compensation separately.

  // --- Optional: nested bank details array (if you support upserting bank details at creation) ---
  @IsOptional()
@IsArray()
@ValidateNested({ each: true })
@Type(() => CreateBankDetailDto)
bankDetails?: CreateBankDetailDto[];
}
