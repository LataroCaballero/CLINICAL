/**
 * SEED: Plantilla "Primera Consulta" para Historia Clínica
 * Crea una plantilla demo con flujo condicional
 */

import { PrismaClient, EstadoPlantillaHC } from '@prisma/client';

const prisma = new PrismaClient();

// Schema de la plantilla "Primera Consulta"
const primeraConsultaSchema = {
  id: 'primera-consulta-v1',
  name: 'Primera Consulta',
  startNodeId: 'motivo',
  nodes: [
    // 1. Motivo de consulta (decision node)
    {
      id: 'motivo',
      type: 'decision',
      title: 'Motivo de consulta',
      key: 'motivo_consulta',
      options: [
        { value: 'estetica_facial', label: 'Estética Facial' },
        { value: 'estetica_corporal', label: 'Estética Corporal' },
        { value: 'ambos', label: 'Ambos (Facial y Corporal)' },
        { value: 'consulta_general', label: 'Consulta General' },
      ],
    },
    // 2. Antecedentes (step node)
    {
      id: 'antecedentes',
      type: 'step',
      title: 'Antecedentes del paciente',
      fields: [
        {
          key: 'antecedentes_medicos',
          label: 'Antecedentes médicos',
          type: 'textarea',
          placeholder: 'Enfermedades previas, cirugías, alergias...',
        },
        {
          key: 'medicacion_actual',
          label: 'Medicación actual',
          type: 'textarea',
          placeholder: 'Medicamentos que toma actualmente...',
        },
        {
          key: 'tratamientos_previos',
          label: 'Tratamientos estéticos previos',
          type: 'textarea',
          placeholder: 'Tratamientos realizados anteriormente...',
        },
        {
          key: 'expectativas',
          label: 'Expectativas del paciente',
          type: 'textarea',
          placeholder: 'Qué espera lograr con el tratamiento...',
        },
      ],
    },
    // 3. Zonas faciales (checklist)
    {
      id: 'zona_facial',
      type: 'checklist',
      title: 'Zonas faciales a tratar',
      key: 'zonas_faciales',
      items: [
        { value: 'frente', label: 'Frente' },
        { value: 'entrecejo', label: 'Entrecejo' },
        { value: 'patas_gallo', label: 'Patas de gallo' },
        { value: 'pomulos', label: 'Pómulos' },
        { value: 'surco_nasogeniano', label: 'Surco nasogeniano' },
        { value: 'labios', label: 'Labios' },
        { value: 'menton', label: 'Mentón' },
        { value: 'papada', label: 'Papada' },
        { value: 'cuello', label: 'Cuello' },
        { value: 'ovalo_facial', label: 'Óvalo facial' },
      ],
    },
    // 4. Zonas corporales (checklist)
    {
      id: 'zona_corporal',
      type: 'checklist',
      title: 'Zonas corporales a tratar',
      key: 'zonas_corporales',
      items: [
        { value: 'abdomen', label: 'Abdomen' },
        { value: 'flancos', label: 'Flancos' },
        { value: 'espalda', label: 'Espalda' },
        { value: 'brazos', label: 'Brazos' },
        { value: 'gluteos', label: 'Glúteos' },
        { value: 'muslos', label: 'Muslos internos' },
        { value: 'muslos_externos', label: 'Muslos externos' },
        { value: 'rodillas', label: 'Rodillas' },
        { value: 'pantorrillas', label: 'Pantorrillas' },
      ],
    },
    // 5. Tratamientos recomendados - Facial (checklist)
    {
      id: 'tratamientos_facial',
      type: 'checklist',
      title: 'Tratamientos faciales recomendados',
      key: 'tratamientos_faciales',
      items: [
        { value: 'botox', label: 'Toxina Botulínica (Botox)' },
        { value: 'acido_hialuronico', label: 'Ácido Hialurónico' },
        { value: 'skinbooster', label: 'Skinbooster' },
        { value: 'mesoterapia_facial', label: 'Mesoterapia Facial' },
        { value: 'prf', label: 'PRF (Plasma Rico en Fibrina)' },
        { value: 'peeling', label: 'Peeling Químico' },
        { value: 'hifu_facial', label: 'HIFU Facial' },
        { value: 'radiofrecuencia_facial', label: 'Radiofrecuencia Facial' },
        { value: 'limpieza_profunda', label: 'Limpieza Profunda' },
      ],
    },
    // 6. Tratamientos recomendados - Corporal (checklist)
    {
      id: 'tratamientos_corporal',
      type: 'checklist',
      title: 'Tratamientos corporales recomendados',
      key: 'tratamientos_corporales',
      items: [
        { value: 'criolipolisis', label: 'Criolipólisis' },
        { value: 'lipolaser', label: 'Lipoláser' },
        { value: 'mesoterapia_corporal', label: 'Mesoterapia Corporal' },
        {
          value: 'radiofrecuencia_corporal',
          label: 'Radiofrecuencia Corporal',
        },
        { value: 'hifu_corporal', label: 'HIFU Corporal' },
        { value: 'carboxiterapia', label: 'Carboxiterapia' },
        { value: 'presoterapia', label: 'Presoterapia' },
        { value: 'drenaje_linfatico', label: 'Drenaje Linfático' },
        { value: 'ultrasonido', label: 'Ultrasonido' },
      ],
    },
    // 7. Observaciones (text node)
    {
      id: 'observaciones',
      type: 'text',
      title: 'Observaciones adicionales',
      key: 'observaciones',
      placeholder:
        'Notas clínicas, recomendaciones especiales, contraindicaciones...',
    },
    // 8. Presupuesto calculado (computed node)
    {
      id: 'presupuesto',
      type: 'computed',
      title: 'Presupuesto estimado',
      key: 'presupuesto_calculado',
      compute: {
        type: 'budget',
        itemsFrom: ['tratamientos_faciales', 'tratamientos_corporales'],
        prices: {
          botox: { descripcion: 'Toxina Botulínica', precio: 150000 },
          acido_hialuronico: {
            descripcion: 'Ácido Hialurónico',
            precio: 180000,
          },
          skinbooster: { descripcion: 'Skinbooster', precio: 120000 },
          mesoterapia_facial: {
            descripcion: 'Mesoterapia Facial',
            precio: 45000,
          },
          prf: { descripcion: 'PRF', precio: 80000 },
          peeling: { descripcion: 'Peeling Químico', precio: 35000 },
          hifu_facial: { descripcion: 'HIFU Facial', precio: 250000 },
          radiofrecuencia_facial: { descripcion: 'RF Facial', precio: 40000 },
          limpieza_profunda: {
            descripcion: 'Limpieza Profunda',
            precio: 25000,
          },
          criolipolisis: { descripcion: 'Criolipólisis', precio: 180000 },
          lipolaser: { descripcion: 'Lipoláser', precio: 200000 },
          mesoterapia_corporal: {
            descripcion: 'Mesoterapia Corporal',
            precio: 50000,
          },
          radiofrecuencia_corporal: {
            descripcion: 'RF Corporal',
            precio: 45000,
          },
          hifu_corporal: { descripcion: 'HIFU Corporal', precio: 300000 },
          carboxiterapia: { descripcion: 'Carboxiterapia', precio: 40000 },
          presoterapia: { descripcion: 'Presoterapia', precio: 30000 },
          drenaje_linfatico: {
            descripcion: 'Drenaje Linfático',
            precio: 35000,
          },
          ultrasonido: { descripcion: 'Ultrasonido', precio: 40000 },
        },
      },
    },
    // 9. Review (review node)
    {
      id: 'review',
      type: 'review',
      title: 'Resumen de la consulta',
    },
  ],
  edges: [
    // Desde motivo hacia antecedentes (siempre)
    { from: 'motivo', to: 'antecedentes' },

    // Desde antecedentes, bifurcación según motivo
    {
      from: 'antecedentes',
      to: 'zona_facial',
      when: { eq: ['motivo_consulta', 'estetica_facial'] },
    },
    {
      from: 'antecedentes',
      to: 'zona_corporal',
      when: { eq: ['motivo_consulta', 'estetica_corporal'] },
    },
    {
      from: 'antecedentes',
      to: 'zona_facial',
      when: { eq: ['motivo_consulta', 'ambos'] },
    },
    {
      from: 'antecedentes',
      to: 'observaciones',
      when: { eq: ['motivo_consulta', 'consulta_general'] },
    },

    // Facial path
    {
      from: 'zona_facial',
      to: 'tratamientos_facial',
      when: { eq: ['motivo_consulta', 'estetica_facial'] },
    },
    {
      from: 'zona_facial',
      to: 'zona_corporal',
      when: { eq: ['motivo_consulta', 'ambos'] },
    },
    { from: 'tratamientos_facial', to: 'observaciones' },

    // Corporal path
    {
      from: 'zona_corporal',
      to: 'tratamientos_corporal',
      when: { eq: ['motivo_consulta', 'estetica_corporal'] },
    },
    {
      from: 'zona_corporal',
      to: 'tratamientos_facial',
      when: { eq: ['motivo_consulta', 'ambos'] },
    },
    { from: 'tratamientos_corporal', to: 'observaciones' },

    // Ambos path - continuar desde tratamientos_facial a corporal
    {
      from: 'tratamientos_facial',
      to: 'tratamientos_corporal',
      when: { eq: ['motivo_consulta', 'ambos'] },
    },

    // Observaciones hacia presupuesto
    { from: 'observaciones', to: 'presupuesto' },

    // Presupuesto hacia review
    { from: 'presupuesto', to: 'review' },
  ],
};

async function main() {
  console.log('🏥 Seed de plantilla "Primera Consulta" para Historia Clínica');

  // ID del profesional específico
  const PROFESIONAL_ID = '9ca9d4e6-c47d-4826-95e0-ecc0fe3caadf';

  // Buscar el profesional específico
  const profesional = await prisma.profesional.findUnique({
    where: { id: PROFESIONAL_ID },
    include: { usuario: true },
  });

  if (!profesional) {
    console.log(`❌ No se encontró el profesional con ID: ${PROFESIONAL_ID}`);
    return;
  }

  console.log(
    `👨‍⚕️ Usando profesional: ${profesional.usuario?.nombre} ${profesional.usuario?.apellido}`,
  );

  // Verificar si ya existe la plantilla
  const existingTemplate = await prisma.historiaClinicaTemplate.findFirst({
    where: {
      nombre: 'Primera Consulta',
      profesionalId: profesional.id,
    },
  });

  if (existingTemplate) {
    console.log(
      '⚠️  La plantilla "Primera Consulta" ya existe para este profesional.',
    );
    console.log('   Saltando creación...');
    return;
  }

  // Crear la plantilla
  const template = await prisma.historiaClinicaTemplate.create({
    data: {
      nombre: 'Primera Consulta',
      descripcion:
        'Plantilla completa para primera consulta de pacientes. Incluye antecedentes, evaluación de zonas, recomendación de tratamientos y presupuesto.',
      profesionalId: profesional.id,
      estado: EstadoPlantillaHC.DRAFT,
    },
  });

  console.log(`✅ Plantilla creada: ${template.nombre} (${template.id})`);

  // Crear la versión 1
  const version = await prisma.historiaClinicaTemplateVersion.create({
    data: {
      templateId: template.id,
      version: 1,
      schema: primeraConsultaSchema,
      publishedAt: new Date(),
    },
  });

  console.log(`   📋 Versión 1 creada`);

  // Actualizar template con currentVersion y publicar
  await prisma.historiaClinicaTemplate.update({
    where: { id: template.id },
    data: {
      currentVersionId: version.id,
      estado: EstadoPlantillaHC.PUBLISHED,
    },
  });

  console.log(`   🚀 Plantilla publicada`);

  console.log('');
  console.log('🎉 Seed completado');
  console.log('');
  console.log('📝 La plantilla incluye:');
  console.log('   - Motivo de consulta (facial/corporal/ambos/general)');
  console.log('   - Antecedentes médicos');
  console.log('   - Selección de zonas (facial y/o corporal según motivo)');
  console.log('   - Tratamientos recomendados');
  console.log('   - Observaciones');
  console.log('   - Presupuesto automático');
  console.log('   - Resumen final');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
