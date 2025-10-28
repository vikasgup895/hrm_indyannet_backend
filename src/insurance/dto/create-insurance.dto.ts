import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateInsuranceDto {
  @IsString()
  employeeId: string;

  @IsString()
  policyNumber: string;

  @IsString()
  provider: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  coverageAmount: number;

  @IsOptional()
  @IsNumber()
  bonusPercent?: number;

  @IsOptional()
  @IsString()
  ctcFileUrl?: string;

  @IsOptional()
  @IsNumber()
  eCashAmount?: number;

  @IsOptional()
  @IsNumber()
  convenienceFee?: number;
}
