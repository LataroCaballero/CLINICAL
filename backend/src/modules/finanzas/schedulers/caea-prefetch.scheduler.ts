import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../prisma/prisma.service';
import { CaeaService } from '../afip/caea.service';
import { calcularProximoPeriodoYOrden } from '../afip/caea.helpers';

@Injectable()
export class CaeaPrefetchScheduler {
  private readonly logger = new Logger(CaeaPrefetchScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly caeaService: CaeaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Bimensual cron: fires on days 12 and 27 at 06:00.
   * Pre-fetches the next CAEA for every tenant with ConfiguracionAFIP,
   * then checks deadlines for CAEA_PENDIENTE_INFORMAR alerts.
   */
  @Cron('0 6 12,27 * *')
  async prefetchAllTenants(): Promise<void> {
    this.logger.log('CAEA pre-fetch cron started');

    const configs = await this.prisma.configuracionAFIP.findMany({});
    const { periodo, orden } = calcularProximoPeriodoYOrden(new Date());

    for (const cfg of configs) {
      try {
        await this.caeaService.solicitarYPersistir(cfg.profesionalId, periodo, orden);
        this.logger.log(`CAEA pre-fetched for profesionalId ${cfg.profesionalId} periodo ${periodo} orden ${orden}`);
      } catch (err: any) {
        this.logger.error(
          `CAEA pre-fetch failed for profesionalId ${cfg.profesionalId}: ${err?.message ?? String(err)}`,
        );
        // Continue to next tenant — one failure must not block others.
      }
    }

    await this.checkDeadlines();
  }

  /**
   * Checks all active CaeaVigente records and sends deadline alert emails
   * when the reporting deadline (fchTopeInf) is within 2 days and there are
   * invoices pending to be informed to AFIP.
   */
  async checkDeadlines(): Promise<void> {
    const caeaVigentes = await this.prisma.caeaVigente.findMany({
      include: {
        profesional: {
          include: { usuario: true, configClinica: true },
        },
      },
    });

    for (const caeaVigente of caeaVigentes) {
      const deadlineDate = parseAfipDate(caeaVigente.fchTopeInf);
      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / 86400000,
      );

      if (daysUntilDeadline > 2) {
        continue;
      }

      const pendingCount = await this.prisma.factura.count({
        where: {
          profesionalId: caeaVigente.profesionalId,
          estado: 'CAEA_PENDIENTE_INFORMAR',
        },
      });

      if (pendingCount === 0) {
        continue;
      }

      await this.sendDeadlineAlert(caeaVigente, pendingCount, daysUntilDeadline);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async sendDeadlineAlert(
    caeaVigente: any,
    pendingCount: number,
    daysLeft: number,
  ): Promise<void> {
    const profesional = caeaVigente.profesional;
    const cc = profesional?.configClinica ?? null;

    const host = cc?.smtpHost ?? this.config.get('SMTP_HOST');
    const port = cc?.smtpPort ?? this.config.get<number>('SMTP_PORT', 587);
    const user = cc?.smtpUser ?? this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');
    const from = cc?.smtpFrom ?? this.config.get('SMTP_FROM', 'noreply@clinical.com');
    const to = profesional?.usuario?.email;

    if (!host || !user || !pass) {
      this.logger.warn(
        `SMTP no configurado — alerta CAEA no enviada a ${to ?? 'unknown'}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `URGENTE: CAEA vence en ${daysLeft} días — ${pendingCount} facturas sin informar`;

    await transporter.sendMail({
      from: `Clinical AFIP <${from}>`,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#dc2626;">Alerta de vencimiento CAEA</h2>
          <p>El plazo para informar facturas CAEA vence en <strong>${daysLeft} día(s)</strong>.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td style="padding:8px;color:#666;">CUIT</td><td style="padding:8px;font-weight:bold;">${caeaVigente.cuit}</td></tr>
            <tr><td style="padding:8px;color:#666;">Fecha tope de informar</td><td style="padding:8px;">${formatAfipDate(caeaVigente.fchTopeInf)}</td></tr>
            <tr><td style="padding:8px;color:#666;">Facturas pendientes de informar</td><td style="padding:8px;font-weight:bold;color:#dc2626;">${pendingCount}</td></tr>
          </table>
          <p>Accedé a <strong>Finanzas → Comprobantes</strong> en Clinical para informar las facturas pendientes.</p>
          <p style="color:#999;font-size:12px;">Email generado automáticamente por Clinical.</p>
        </div>`,
    });

    this.logger.warn(
      `Alerta CAEA enviada a ${to} — ${daysLeft}d restantes, ${pendingCount} facturas pendientes, CUIT ${caeaVigente.cuit}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Module-level pure helpers
// ---------------------------------------------------------------------------

/**
 * Parses an AFIP date string (YYYYMMDD) into a UTC midnight Date.
 */
function parseAfipDate(fch: string): Date {
  const year = parseInt(fch.slice(0, 4), 10);
  const month = parseInt(fch.slice(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(fch.slice(6, 8), 10);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Formats an AFIP date string (YYYYMMDD) as DD/MM/YYYY.
 */
function formatAfipDate(fch: string): string {
  return `${fch.slice(6, 8)}/${fch.slice(4, 6)}/${fch.slice(0, 4)}`;
}
