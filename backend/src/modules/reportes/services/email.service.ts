import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP no configurado. Los emails de reportes estarán deshabilitados.',
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

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email no enviado: SMTP no configurado');
      return false;
    }

    try {
      const fromEmail = this.configService.get<string>(
        'SMTP_FROM',
        'reportes@clinical.com',
      );

      await this.transporter.sendMail({
        from: `Clinical Reportes <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      this.logger.log(`Email enviado a ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email a ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Genera el HTML para el email de reporte
   */
  generateReportEmailHtml(params: {
    nombreUsuario: string;
    tipoReporte: string;
    periodo: string;
    resumen: Record<string, string | number>;
  }): string {
    const resumenHtml = Object.entries(params.resumen)
      .map(
        ([key, value]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">${key}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${value}</td>
        </tr>
      `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Reporte ${params.tipoReporte}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${params.periodo}</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333; margin-bottom: 20px;">
              Hola <strong>${params.nombreUsuario}</strong>,
            </p>
            <p style="color: #666; margin-bottom: 25px;">
              Aquí tienes tu reporte ${params.tipoReporte.toLowerCase()} correspondiente a ${params.periodo}.
            </p>

            <!-- Resumen -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Resumen</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${resumenHtml}
              </table>
            </div>

            <p style="color: #666; font-size: 14px;">
              El reporte completo se encuentra adjunto en formato PDF.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Este email fue generado automáticamente por Clinical.<br>
              Para modificar tus preferencias de reportes, accede a Configuración en la plataforma.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
