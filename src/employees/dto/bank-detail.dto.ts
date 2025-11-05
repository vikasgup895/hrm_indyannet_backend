// src/employees/dto/bank-detail.dto.ts
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateBankDetailDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  pfNumber?: string;

  @IsOptional()
  @IsString()
  uan?: string;
}

/**
 * For updates all fields are optional.
 * You can use PartialType(CreateBankDetailDto) from @nestjs/mapped-types
 * if you're using NestJS. Below is a plain class version using optional decorators.
 */
export class UpdateBankDetailDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  pfNumber?: string;

  @IsOptional()
  @IsString()
  uan?: string;
}
