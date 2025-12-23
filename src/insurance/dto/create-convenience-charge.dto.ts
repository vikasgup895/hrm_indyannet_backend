import { IsString, IsNumber, IsISO8601 } from 'class-validator';

export class CreateConvenienceChargeDto {
  @IsString()
  employeeId: string;

  @IsString()
  title: string;

  @IsNumber()
  amount: number;

  @IsISO8601()
  date: string; // This will accept ISO date strings like "2025-11-06"
}
