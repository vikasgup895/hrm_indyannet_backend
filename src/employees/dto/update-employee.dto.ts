// src/employees/dto/update-employee.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeStatusDto } from './create-employee.dto';
import { GenderDto } from './create-employee.dto';
import { UpdateBankDetailDto } from './bank-detail.dto';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(EmployeeStatusDto)
  status?: EmployeeStatusDto;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

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
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(GenderDto)
  gender?: GenderDto;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  // allow patching/adding a single bank detail (one-to-one)
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBankDetailDto)
  bankDetail?: UpdateBankDetailDto;
}
