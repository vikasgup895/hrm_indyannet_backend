import { PartialType } from '@nestjs/mapped-types';
import { CreateConvenienceChargeDto } from './create-convenience-charge.dto';
import { IsOptional, IsISO8601 } from 'class-validator';

export class UpdateConvenienceChargeDto extends PartialType(CreateConvenienceChargeDto) {
  @IsOptional()
  @IsISO8601()
  date?: string;
}