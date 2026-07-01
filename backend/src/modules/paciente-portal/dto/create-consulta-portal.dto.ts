import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Narrow write surface for the patient-portal consult endpoint (CHAT-04).
 *
 * Declares a SINGLE field: `mensaje`. The patient identity (`pacienteId`) is
 * ALWAYS derived from the portal-scoped JWT (`req.user.pacienteId`) in the
 * controller — it is never declared here so it cannot be injected via the
 * request body (D-03, pitfall 12, T-55-01).
 *
 * SC#3 protection (mass-assignment of `autorId`, `prioridad`, etc.) is enforced
 * by a `new ValidationPipe({ whitelist: true })` per-route in the controller
 * (T-55-02). There is NO global ValidationPipe in this project — the per-route
 * pipe is load-bearing.
 */
export class CreateConsultaPortalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  mensaje: string;
}
