import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as crypto from 'crypto';

/**
 * ConsentStampService
 *
 * PDF stamping engine for legal consent archival (CONS-05 / CONS-06).
 *
 * Responsibilities:
 *  - Load the vigente template PDF (supplied as Buffer by the caller)
 *  - Embed the patient's drawn signature PNG on the last page
 *  - Draw a visible forensic box with metadata (fecha UTC / IP / userAgent / version)
 *  - Return the signed PDF as a Buffer plus its SHA-256 hash
 *
 * Security invariants (D-01 / D-02 / T-56-07 / T-56-08):
 *  - The ORIGINAL template buffer is NEVER mutated; pdf-lib.load() copies it.
 *  - Hash is computed AFTER pdfDoc.save() over the FINAL buffer — not over the template.
 *  - The hash value is NEVER written into the PDF body (D-02 circular constraint).
 *  - PNG magic bytes are validated before embedPng (T-56-08).
 *  - White rect drawn BEFORE the PNG to flatten alpha transparency (Pitfall F).
 *  - Coordinate origin is bottom-left (Pitfall A): stamp sits at y = MARGIN (near page bottom).
 */
@Injectable()
export class ConsentStampService {
  private readonly logger = new Logger(ConsentStampService.name);

  /** 8-byte PNG magic: \x89PNG\r\n\x1a\n */
  private static readonly PNG_MAGIC = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  /**
   * Validates that the supplied buffer contains a PNG image.
   * Mirrors the `%PDF-` magic-byte check in consentimientos.service.ts:44.
   *
   * @throws BadRequestException if the first 8 bytes do not match the PNG signature.
   */
  validatePngMagicBytes(pngBuffer: Buffer): void {
    if (pngBuffer.length < 8) {
      throw new BadRequestException('El archivo de firma no es un PNG válido');
    }
    if (!pngBuffer.subarray(0, 8).equals(ConsentStampService.PNG_MAGIC)) {
      throw new BadRequestException('El archivo de firma no es un PNG válido');
    }
  }

  /**
   * Stamps the patient signature PNG and a visible forensic metadata box
   * onto the LAST page of the provided template PDF.
   *
   * Layout (pdf-lib coordinate origin = bottom-left):
   *   - Forensic box: x=MARGIN, y=MARGIN (near physical bottom), height=BOX_HEIGHT
   *   - Signature image: right ~40% of the box, vertically centered
   *   - Forensic text: left portion, top-down, lines spaced by LINE_GAP
   *
   * Forensic box content (D-02: hash is NOT printed — only fecha/IP/userAgent/version):
   *   Line 1 (bold): "CONSENTIMIENTO FIRMADO DIGITALMENTE"
   *   Line 2: "Fecha (UTC): <fechaUtc>"
   *   Line 3: "IP: <ip>"
   *   Line 4: "Navegador: <userAgent truncated to 80 chars>"
   *   Line 5: "Versión del consentimiento: <version>"
   *
   * @param input.templateBuffer  - Buffer of the vigente template PDF (read via StorageService)
   * @param input.signaturePngBuffer - Raw PNG bytes of the drawn signature (magic-byte validated by caller or here)
   * @param input.metadata.fechaUtc  - ISO 8601 UTC timestamp string e.g. "2026-07-01T14:23:00.000Z"
   * @param input.metadata.ip        - Client IP (captured server-side from X-Forwarded-For)
   * @param input.metadata.userAgent - Client user-agent header (truncated internally)
   * @param input.metadata.version   - Integer version number of the consent template
   *
   * @returns { pdfBuffer: Buffer, hashSha256: string }
   *   pdfBuffer  — signed PDF ready for StorageService.save()
   *   hashSha256 — SHA-256 hex digest over the FINAL signed buffer (D-02: for DB only, never in PDF)
   */
  async stampConsentimiento(input: {
    templateBuffer: Buffer;
    signaturePngBuffer: Buffer;
    metadata: {
      fechaUtc: string;
      ip: string;
      userAgent: string;
      version: number;
    };
  }): Promise<{ pdfBuffer: Buffer; hashSha256: string }> {
    const { templateBuffer, signaturePngBuffer, metadata } = input;

    this.logger.debug(
      `Stamping consent PDF — version ${metadata.version}, IP ${metadata.ip}`,
    );

    // Validate PNG magic bytes before embedding (T-56-08)
    this.validatePngMagicBytes(signaturePngBuffer);

    // 1. Load existing PDF — never mutates templateBuffer (pdf-lib copies internally)
    const pdfDoc = await PDFDocument.load(templateBuffer);

    // 2. Last page — coordinate origin is BOTTOM-LEFT (Pitfall A)
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();

    // 3. Embed standard fonts (Helvetica built-in — no @pdf-lib/fontkit needed)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 4. Embed PNG signature image
    const pngImage = await pdfDoc.embedPng(signaturePngBuffer);

    // Layout constants (all values in points; origin = bottom-left)
    const MARGIN = 40;
    const BOX_HEIGHT = 140;
    const LINE_GAP = 13;
    const boxY = MARGIN; // boxY is the BOTTOM edge of the stamp box (near physical page bottom)
    const boxWidth = width - 2 * MARGIN;

    // 5. White background rectangle — drawn FIRST to flatten PNG alpha transparency (Pitfall F)
    lastPage.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: boxWidth,
      height: BOX_HEIGHT,
      color: rgb(1, 1, 1),
    });

    // 6. Forensic border box (visible frame — D-02)
    lastPage.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: boxWidth,
      height: BOX_HEIGHT,
      borderColor: rgb(0.3, 0.3, 0.3),
      borderWidth: 0.5,
    });

    // 7. Draw signature image — right ~40% of the box, vertically centered
    const sigWidth = boxWidth * 0.4;
    const sigHeight = 60;
    const sigX = width - MARGIN - sigWidth - 8;
    const sigY = boxY + (BOX_HEIGHT - sigHeight) / 2;
    lastPage.drawImage(pngImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
    });

    // 8. Draw forensic text lines (left portion of the box)
    // NOTE: hashSha256 is intentionally NOT printed here — D-02 prohibits circular embedding
    const textX = MARGIN + 8;
    let textY = boxY + BOX_HEIGHT - 18; // start near top-inside of box

    lastPage.drawText('CONSENTIMIENTO FIRMADO DIGITALMENTE', {
      x: textX,
      y: textY,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    textY -= LINE_GAP;
    lastPage.drawText(`Fecha (UTC): ${metadata.fechaUtc}`, {
      x: textX,
      y: textY,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });

    textY -= LINE_GAP;
    lastPage.drawText(`IP: ${metadata.ip}`, {
      x: textX,
      y: textY,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });

    textY -= LINE_GAP;
    // Truncate userAgent to 80 chars to fit within the box width
    const ua = metadata.userAgent.slice(0, 80);
    lastPage.drawText(`Navegador: ${ua}`, {
      x: textX,
      y: textY,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });

    textY -= LINE_GAP;
    lastPage.drawText(`Versión del consentimiento: ${metadata.version}`, {
      x: textX,
      y: textY,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });

    // 9. Serialize to Uint8Array then Buffer
    // pdfDoc.save() returns Uint8Array — must wrap with Buffer.from() for StorageService
    const pdfUint8 = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfUint8);

    // 10. Compute SHA-256 OVER THE FINAL BUFFER (D-02 critical ordering — AFTER save())
    // The hash is computed over the signed PDF; it is NEVER embedded in the PDF body.
    const hashSha256 = crypto
      .createHash('sha256')
      .update(pdfBuffer)
      .digest('hex');

    this.logger.debug(
      `Consent PDF stamped — size ${pdfBuffer.length} bytes, SHA-256 ${hashSha256.slice(0, 16)}...`,
    );

    return { pdfBuffer, hashSha256 };
  }
}
