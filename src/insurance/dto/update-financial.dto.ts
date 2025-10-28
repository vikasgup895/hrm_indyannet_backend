import { IsOptional, IsNumber } from 'class-validator';

export class UpdateFinancialDto {
  @IsOptional()
  @IsNumber()
  bonusPercent?: number;

  @IsOptional()
  @IsNumber()
  eCashAmount?: number;

  @IsOptional()
  @IsNumber()
  convenienceFee?: number;
}
