const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, BorderStyle, WidthType, ShadingType, AlignmentType, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1a1a1a" },
        paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "444444" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "checkNumbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Title
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Reporte de Revision Pre-Deploy")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Sistema de Gestion de Clinicas - CLINICAL", italics: true, color: "666666" })]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Fecha: 31 de Enero, 2026", size: 20, color: "888888" })]
      }),
      new Paragraph({ children: [] }),

      // Resumen Ejecutivo
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Resumen Ejecutivo")]
      }),
      new Paragraph({
        children: [new TextRun("Se realizo una revision completa del sistema para verificar que esta listo para el upgrade del cliente. Se encontraron y corrigieron 2 errores de TypeScript que habrian causado fallo en el build de Vercel.")]
      }),
      new Paragraph({ children: [] }),

      // Estado del Sistema
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Estado del Sistema")]
      }),

      // Tabla de estado
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [4000, 3000, 2360],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4000, type: WidthType.DXA },
                shading: { fill: "2563EB", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Componente", bold: true, color: "FFFFFF" })] })]
              }),
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: "2563EB", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true, color: "FFFFFF" })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2360, type: WidthType.DXA },
                shading: { fill: "2563EB", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Accion", bold: true, color: "FFFFFF" })] })]
              }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Frontend (Next.js 16)")] })] }),
              new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                shading: { fill: "DCFCE7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "CORREGIDO", bold: true, color: "166534" })] })] }),
              new TableCell({ borders, width: { size: 2360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("2 errores TS arreglados")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Backend (NestJS)")] })] }),
              new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                shading: { fill: "DCFCE7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "OK", bold: true, color: "166534" })] })] }),
              new TableCell({ borders, width: { size: 2360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Compila sin errores")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Prisma Migrations")] })] }),
              new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: "REQUIERE ATENCION", bold: true, color: "92400E" })] })] }),
              new TableCell({ borders, width: { size: 2360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Ver seccion de DB")] })] }),
            ]
          }),
        ]
      }),
      new Paragraph({ children: [] }),

      // Errores Corregidos
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Errores de TypeScript Corregidos")]
      }),
      new Paragraph({
        children: [new TextRun("Se encontraron 2 errores identicos en componentes de graficos (Recharts) donde el parametro 'percent' no tenia tipo explicito:")]
      }),
      new Paragraph({ children: [] }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "ReportesTab.tsx", bold: true }), new TextRun(" (finanzas/facturacion/components/)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "page.tsx", bold: true }), new TextRun(" (finanzas/reportes/)")]
      }),
      new Paragraph({ children: [] }),
      new Paragraph({
        children: [new TextRun({ text: "Solucion aplicada: ", bold: true }), new TextRun("Se agrego type assertion '(props.percent as number)' para el parametro del label del PieChart.")]
      }),
      new Paragraph({ children: [] }),

      // Base de Datos
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Base de Datos (Supabase)")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Problema Detectado")]
      }),
      new Paragraph({
        children: [new TextRun("Existe un 'drift' entre el schema de Prisma y las migraciones registradas. Esto significa que algunos cambios fueron aplicados directamente en la base de datos sin registrar en la tabla _prisma_migrations.")]
      }),
      new Paragraph({ children: [] }),
      new Paragraph({
        children: [new TextRun({ text: "Cambios detectados en la BD que no estan en migraciones:", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Tabla 'Tratamiento' agregada")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Columnas 'profesionalId' ahora son NOT NULL en: Inventario, Lote, OrdenCompra, VentaProducto")]
      }),
      new Paragraph({ children: [] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        shading: { fill: "FEE2E2", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "IMPORTANTE: NO usar 'prisma migrate reset'", color: "991B1B" })]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Este comando ELIMINARIA TODOS LOS DATOS del cliente. ", bold: true, color: "DC2626" }),
                   new TextRun("Nunca ejecutarlo en produccion.")]
      }),
      new Paragraph({ children: [] }),

      // Pasos para Deploy
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Pasos para el Deploy Seguro")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Paso 1: Verificar estado de migraciones en Supabase")]
      }),
      new Paragraph({
        children: [new TextRun("Conectate a Supabase y ejecuta:")]
      }),
      new Paragraph({
        shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;", font: "Courier New", size: 20 })]
      }),
      new Paragraph({ children: [] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Paso 2: Sincronizar migraciones (si hay drift)")]
      }),
      new Paragraph({
        children: [new TextRun("Si las migraciones 20260111, 20260112 y 20260122 NO estan en la tabla pero los cambios YA existen en la BD, marcalas como aplicadas:")]
      }),
      new Paragraph({
        shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "npx prisma migrate resolve --applied 20260111_add_stock_profesional_columns", font: "Courier New", size: 20 })]
      }),
      new Paragraph({
        shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "npx prisma migrate resolve --applied 20260112_add_tratamiento", font: "Courier New", size: 20 })]
      }),
      new Paragraph({
        shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "npx prisma migrate resolve --applied 20260122223311_sync_check", font: "Courier New", size: 20 })]
      }),
      new Paragraph({ children: [] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Paso 3: Regenerar Prisma Client")]
      }),
      new Paragraph({
        shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "cd backend && npx prisma generate", font: "Courier New", size: 20 })]
      }),
      new Paragraph({ children: [] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Paso 4: Deploy Frontend en Vercel")]
      }),
      new Paragraph({
        numbering: { reference: "checkNumbers", level: 0 },
        children: [new TextRun("Commit los cambios de TypeScript corregidos")]
      }),
      new Paragraph({
        numbering: { reference: "checkNumbers", level: 0 },
        children: [new TextRun("Push a la rama correspondiente (develop o main)")]
      }),
      new Paragraph({
        numbering: { reference: "checkNumbers", level: 0 },
        children: [new TextRun("Vercel detectara el push y ejecutara el build automaticamente")]
      }),
      new Paragraph({ children: [] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Paso 5: Deploy Backend en VPS")]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Conectarse al VPS via SSH")]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("git pull en el directorio del backend")]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("npm install (si hay nuevas dependencias)")]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("npm run build")]
      }),
      new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Reiniciar el servicio (pm2 restart o systemctl restart)")]
      }),
      new Paragraph({ children: [] }),

      // Nuevas Funcionalidades
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Nuevas Funcionalidades Incluidas")]
      }),
      new Paragraph({
        children: [new TextRun("Esta actualizacion incluye las siguientes mejoras para el cliente:")]
      }),
      new Paragraph({ children: [] }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Tratamientos por Profesional: ", bold: true }), new TextRun("Cada profesional puede gestionar su propio catalogo de tratamientos con precios, indicaciones y procedimientos.")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Stock Multi-tenant: ", bold: true }), new TextRun("Inventario, lotes y ordenes de compra ahora estan asociados a cada profesional de forma independiente.")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Mensajes Internos v2: ", bold: true }), new TextRun("Sistema mejorado de comunicacion interna entre usuarios del sistema.")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Reportes de Facturacion: ", bold: true }), new TextRun("Nuevos graficos y metricas en el modulo de finanzas.")]
      }),
      new Paragraph({ children: [] }),

      // Checklist Final
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Checklist Pre-Deploy")]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [700, 8660],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "DCFCE7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "OK", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Errores de TypeScript corregidos")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "DCFCE7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "OK", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Backend compila correctamente")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Verificar estado de migraciones en Supabase")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Sincronizar migraciones si es necesario (prisma migrate resolve)")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Hacer backup de la base de datos antes del deploy")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Deploy frontend en Vercel")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Deploy backend en VPS")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 700, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
                shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ ]", bold: true })] })] }),
              new TableCell({ borders, width: { size: 8660, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Verificar que el cliente puede acceder a nuevas funciones")] })] }),
            ]
          }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/ecstatic-brave-curie/mnt/CLINICAL/Reporte-Revision-Pre-Deploy.docx", buffer);
  console.log("Reporte generado exitosamente!");
});
