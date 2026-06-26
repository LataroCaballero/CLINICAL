import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

/**
 * SMTP-aware portal link emailer (D-13 / PREOP-12).
 * Follows the same transporter-init + isConfigured guard pattern as
 * reportes/services/email.service.ts. Never throws on send failure —
 * returns false so callers can degrade gracefully.
 */
@Injectable()
export class PortalEmailService {
  private readonly logger = new Logger(PortalEmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP no configurado. El envío de links de portal estará deshabilitado.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  /**
   * Returns true only when SMTP_HOST, SMTP_USER and SMTP_PASS are all present.
   * Used by the controller to populate the `smtpConfigured` flag in the response.
   */
  isSmtpConfigured(): boolean {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    return !!(host && user && pass);
  }

  /**
   * Sends the portal link to the patient.
   * Returns false (never throws) when SMTP is not configured or on send error.
   */
  async enviarLinkPortal(
    to: string,
    url: string,
    pacienteNombre: string,
  ): Promise<boolean> {
    if (!this.isSmtpConfigured() || !this.transporter) {
      this.logger.warn('Link de portal no enviado: SMTP no configurado');
      return false;
    }

    try {
      const fromEmail = this.configService.get<string>(
        'SMTP_FROM',
        'portal@clinical.com',
      );

      await this.transporter.sendMail({
        from: `Clinical <${fromEmail}>`,
        to,
        subject: 'Tu acceso al portal del paciente',
        html: this.buildHtml(pacienteNombre, url),
      });

      this.logger.log(`Link de portal enviado a ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando link de portal a ${to}:`, error);
      return false;
    }
  }

  private buildHtml(pacienteNombre: string, url: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Portal del Paciente</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #333; margin-bottom: 16px;">Hola <strong>${pacienteNombre}</strong>,</p>
      <p style="color: #666; margin-bottom: 24px;">
        Tu profesional te ha compartido acceso al portal del paciente donde podrás
        completar tu historia clínica prequirúrgica de forma segura.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Acceder al portal
        </a>
      </div>
      <p style="color: #999; font-size: 13px; text-align: center;">
        Si no esperabas este email, puedes ignorarlo.<br>
        El enlace es personal — no lo compartas con terceros.
      </p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        Este email fue generado automáticamente por Clinical.
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}
