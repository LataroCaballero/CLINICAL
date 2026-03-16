import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CertExpiryScheduler {
  private readonly logger = new Logger(CertExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 8 * * *') // 8 AM daily (server timezone)
  async checkCertExpiry(): Promise<void> {
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiring = await this.prisma.configuracionAFIP.findMany({
      where: { certExpiresAt: { lte: in60, gte: now } },
      include: {
        profesional: {
          include: { usuario: true, configClinica: true },
        },
      },
    });

    for (const cfg of expiring) {
      const daysLeft = Math.floor(
        (cfg.certExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      // Guard: only send at exactly 60d, 30d, and daily for the last <=5 days (urgent window)
      if (daysLeft === 60 || daysLeft === 30 || daysLeft <= 5) {
        await this.sendAlert(cfg, daysLeft);
      }
    }
  }

  private async sendAlert(cfg: any, daysLeft: number): Promise<void> {
    const cc = cfg.profesional.configClinica;
    const host = cc?.smtpHost ?? this.config.get('SMTP_HOST');
    const port = cc?.smtpPort ?? this.config.get<number>('SMTP_PORT', 587);
    const user = cc?.smtpUser ?? this.config.get('SMTP_USER');
    // ConfigClinica smtpPassEncrypted decryption is a pre-existing gap (same as PresupuestoEmailService)
    // env-var SMTP_PASS is the safe path for Phase 12
    const pass = this.config.get('SMTP_PASS');
    const from = cc?.smtpFrom ?? this.config.get('SMTP_FROM', 'noreply@clinical.com');
    const to = cfg.profesional.usuario.email;

    if (!host || !user || !pass) {
      this.logger.warn(`SMTP no configurado — alerta de vencimiento no enviada a ${to}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const urgency = daysLeft <= 5 ? 'URGENTE: ' : '';
    const expiryStr = cfg.certExpiresAt.toLocaleDateString('es-AR');

    await transporter.sendMail({
      from: `Clinical AFIP <${from}>`,
      to,
      subject: `${urgency}Certificado AFIP vence en ${daysLeft} días — CUIT ${cfg.cuit}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#dc2626;">Certificado AFIP próximo a vencer</h2>
          <p>El certificado digital AFIP vencerá en <strong>${daysLeft} días</strong> (${expiryStr}).</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td style="padding:8px;color:#666;">CUIT</td><td style="padding:8px;font-weight:bold;">${cfg.cuit}</td></tr>
            <tr><td style="padding:8px;color:#666;">Ambiente</td><td style="padding:8px;">${cfg.ambiente}</td></tr>
            <tr><td style="padding:8px;color:#666;">Vencimiento</td><td style="padding:8px;">${expiryStr}</td></tr>
          </table>
          <p>Accedé a <strong>Configuración → AFIP</strong> en Clinical para cargar el certificado renovado.</p>
          <p style="color:#999;font-size:12px;">Email generado automáticamente por Clinical.</p>
        </div>`,
    });

    this.logger.log(
      `Alerta de vencimiento enviada a ${to} — ${daysLeft}d restantes CUIT ${cfg.cuit}`,
    );
  }
}
