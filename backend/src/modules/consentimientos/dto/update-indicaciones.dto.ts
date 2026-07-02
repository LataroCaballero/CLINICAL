import { IsOptional, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateIndicacionesDto {
  /**
   * URL to an external indicaciones document (CONS-02).
   * Validation:
   *   - @IsOptional: field may be absent from request body
   *   - @ValidateIf: skip @IsUrl when value is null (allows clearing with null)
   *   - @IsUrl: validates the URL format when a non-null string is provided (T-53-11)
   *   - @MaxLength(2048): standard URL length cap
   */
  @IsOptional()
  @ValidateIf((o: UpdateIndicacionesDto) => o.indicacionesUrl !== null)
  @IsUrl()
  @MaxLength(2048)
  indicacionesUrl: string | null;
}
