import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PresupuestoPdfService } from './presupuesto-pdf.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { EstadoPresupuesto, EtapaCRM, TipoContacto } from '@prisma/client';

@Injectable()
export class PresupuestoEmailService {
  private readonly logger = new Logger(PresupuestoEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PresupuestoPdfService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genera PDF, envía email con adjunto, genera token, marca ENVIADO y sube CRM.
   */
  async enviarPresupuestoPorEmail(
    presupuestoId: string,
    emailDestino: string,
    notaCoordinador?: string,
  ): Promise<void> {
    // 1. Fetch full presupuesto with relations
    const presupuesto = await this.prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: {
        items: { orderBy: { orden: 'asc' } },
        paciente: {
          select: {
            id: true,
            nombreCompleto: true,
            dni: true,
            email: true,
            telefono: true,
            profesionalId: true,
            usuario: { select: { id: true } },
          },
        },
        profesional: {
          include: {
            usuario: { select: { nombre: true, apellido: true, id: true } },
            configClinica: true,
          },
        },
      },
    });

    if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');
    if (presupuesto.estado !== EstadoPresupuesto.BORRADOR) {
      throw new Error('Solo se pueden enviar presupuestos en estado BORRADOR');
    }

    const config = presupuesto.profesional.configClinica;

    // 2. Generate PDF buffer
    const pdfData = {
      id: presupuesto.id,
      moneda: presupuesto.moneda,
      fechaValidez: presupuesto.fechaValidez,
      createdAt: presupuesto.createdAt,
      items: presupuesto.items.map((i) => ({
        descripcion: i.descripcion,
        precioTotal: Number(i.precioTotal),
      })),
      subtotal: Number(presupuesto.subtotal),
      descuentos: Number(presupuesto.descuentos),
      total: Number(presupuesto.total),
      notaCoordinador,
      paciente: {
        nombreCompleto: presupuesto.paciente.nombreCompleto,
        dni: presupuesto.paciente.dni,
        email: presupuesto.paciente.email,
        telefono: presupuesto.paciente.telefono,
      },
      config: {
        nombreClinica: config?.nombreClinica,
        logoUrl: config?.logoUrl,
        direccion: config?.direccion,
        telefono: config?.telefono,
        emailContacto: config?.emailContacto,
        web: config?.web,
        piePaginaTexto: config?.piePaginaTexto,
      },
      profesional: {
        nombre: presupuesto.profesional.usuario.nombre,
        apellido: presupuesto.profesional.usuario.apellido,
      },
    };

    const pdfBuffer = await this.pdfService.generatePdfBuffer(pdfData);

    // 3. Generate acceptance token
    const token = crypto.randomUUID();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const acceptanceUrl = `${frontendUrl}/presupuesto/${token}`;

    // 4. Send email
    const clinicaNombre = config?.nombreClinica ?? 'la clínica';
    await this.sendEmail({
      config,
      to: emailDestino,
      subject: `Presupuesto de ${clinicaNombre}`,
      html: this.buildEmailHtml({
        pacienteNombre: presupuesto.paciente.nombreCompleto,
        clinicaNombre,
        notaCoordinador,
        acceptanceUrl,
        total: Number(presupuesto.total),
        moneda: presupuesto.moneda,
      }),
      pdfBuffer,
      presupuestoId: presupuesto.id,
    });

    // 5. Mark as ENVIADO + update CRM + store token (transaction)
    await this.prisma.$transaction([
      this.prisma.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          estado: EstadoPresupuesto.ENVIADO,
          fechaEnviado: new Date(),
          tokenAceptacion: token,
        },
      }),
      this.prisma.paciente.update({
        where: { id: presupuesto.paciente.id },
        data: { etapaCRM: EtapaCRM.PRESUPUESTO_ENVIADO },
      }),
      this.prisma.contactoLog.create({
        data: {
          pacienteId: presupuesto.paciente.id,
          profesionalId: presupuesto.profesionalId,
          tipo: TipoContacto.SISTEMA,
          nota: 'Presupuesto enviado por email — esperando respuesta',
        },
      }),
    ]);

    this.logger.log(`Presupuesto ${presupuestoId} enviado por email a ${emailDestino}`);
  }

  private async sendEmail(params: {
    config: any;
    to: string;
    subject: string;
    html: string;
    pdfBuffer: Buffer;
    presupuestoId: string;
  }): Promise<void> {
    // Use ConfigClinica SMTP if available, else fall back to env vars
    const host = params.config?.smtpHost ?? this.configService.get('SMTP_HOST');
    const port = params.config?.smtpPort ?? this.configService.get<number>('SMTP_PORT', 587);
    const user = params.config?.smtpUser ?? this.configService.get('SMTP_USER');
    const passEncrypted = params.config?.smtpPassEncrypted;
    const pass = passEncrypted
      ? await this.decryptSmtpPass(passEncrypted)
      : this.configService.get('SMTP_PASS');
    const from = params.config?.smtpFrom ?? this.configService.get('SMTP_FROM', 'noreply@clinical.com');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP no configurado — email de presupuesto no enviado');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `Clinical <${from}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{
        filename: `presupuesto-${params.presupuestoId.slice(0, 8)}.pdf`,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      }],
    });
  }

  private async decryptSmtpPass(encrypted: string): Promise<string> {
    // EncryptionService from whatsapp module — import if needed
    // For now, return as-is (will be wired in future if clinic SMTP is added to UI)
    return encrypted;
  }

  private buildEmailHtml(params: {
    pacienteNombre: string;
    clinicaNombre: string;
    notaCoordinador?: string;
    acceptanceUrl: string;
    total: number;
    moneda: string;
  }): string {
    const simbolo = params.moneda === 'USD' ? 'U$S' : '$';
    const notaHtml = params.notaCoordinador
      ? `<p style="background:#f8f9fa;padding:12px;border-radius:6px;font-style:italic;">${params.notaCoordinador}</p>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f5f5f5; margin:0; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#6366f1,#4f46e5); padding:30px; text-align:center;">
            <h1 style="color:white; margin:0; font-size:22px;">Presupuesto de ${params.clinicaNombre}</h1>
          </div>
          <div style="padding:30px;">
            <p>Estimado/a <strong>${params.pacienteNombre}</strong>,</p>
            <p>Adjunto encontrará su presupuesto por un total de <strong>${simbolo} ${params.total.toLocaleString('es-AR')}</strong>.</p>
            ${notaHtml}
            <p>Para aceptar o rechazar este presupuesto, haga clic en el siguiente enlace:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${params.acceptanceUrl}" style="background:#6366f1; color:white; padding:14px 28px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;">
                Ver y Responder Presupuesto
              </a>
            </div>
            <p style="font-size:13px; color:#666;">Si no puede hacer clic en el botón, copie y pegue este enlace en su navegador:<br><a href="${params.acceptanceUrl}">${params.acceptanceUrl}</a></p>
          </div>
          <div style="background:#f8f9fa; padding:20px; text-align:center; border-top:1px solid #eee;">
            <p style="color:#999; font-size:12px; margin:0;">Este email fue generado automáticamente por Clinical.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
