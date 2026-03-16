export class WabaConfigResponseDto {
  phoneNumberId: string;
  displayPhone: string;
  verifiedName?: string;
  activo: boolean;
  // NOTE: accessTokenEncrypted is deliberately excluded — NEVER expose in responses
}
