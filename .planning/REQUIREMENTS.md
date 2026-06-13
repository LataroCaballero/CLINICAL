# Requirements: CLINICAL — Milestone v1.9 Plantilla Primera Consulta

**Defined:** 2026-06-12
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible

## v1.9 Requirements

Requisitos del milestone actual. Cada uno mapea a una fase del roadmap.

### Catálogo de Zonas en BD

- [x] **ZONA-01**: El catálogo de zonas/diagnósticos/tratamientos de HC se persiste en BD por profesional (reemplaza el JSON hardcodeado `zonas-diagnostico.json`)
- [x] **ZONA-02**: Seed inicial con 6 zonas (Abdomen, Mamas, Nariz, Facial, Locales, Otros) con los diagnósticos y tratamientos actuales mapeados por zona (abdominoplastia→Abdomen, mastoplastia→Mamas, rinoplastia→Nariz, tratamiento_facial→Facial, lunar_cirugia_local→Locales)
- [x] **ZONA-03**: Facial y Locales arrancan con diagnósticos = [Otros] (hoy no tienen diagnósticos definidos)

### Formulario Primera Consulta

- [x] **FORM-01**: El profesional ve primero las zonas; al seleccionar una se despliega su grupo de diagnósticos y su grupo de tratamientos correspondientes
- [x] **FORM-02**: Con dos o más zonas seleccionadas, los diagnósticos y tratamientos se agrupan visualmente por zona
- [x] **FORM-03**: La entrada de HC guarda la selección de diagnósticos/tratamientos agrupada por zona
- [x] **FORM-04**: Los tratamientos seleccionados mantienen el lookup de precio del catálogo del profesional y el flujo "Generar presupuesto" existente

### Auto-aprendizaje vía "Otros"

- [x] **APR-01**: Al seleccionar "Otros" como zona y escribir un nombre, la zona nueva se guarda en BD para ese profesional y despliega diagnóstico/tratamiento con la opción "Otros"
- [x] **APR-02**: Al seleccionar "Otros" en diagnósticos de cualquier zona y escribir un nombre, ese diagnóstico queda guardado en esa zona para la próxima vez
- [x] **APR-03**: Al seleccionar "Otros" en tratamientos de cualquier zona y escribir un nombre, ese tratamiento queda guardado en esa zona para la próxima vez
- [x] **APR-04**: Un tratamiento aprendido se crea también en el catálogo de tratamientos del profesional (precio 0, a completar en Configuración)

### Admin UI en Configuración

- [ ] **ADM-01**: El profesional puede ver en Configuración el catálogo completo de zonas con sus diagnósticos y tratamientos
- [ ] **ADM-02**: El profesional puede renombrar zonas, diagnósticos y tratamientos del catálogo
- [ ] **ADM-03**: El profesional puede eliminar zonas, diagnósticos y tratamientos (dejan de aparecer en la plantilla; las HC históricas no se modifican)

## Future Requirements

Diferidos de milestones anteriores, no incluidos en v1.9.

### Tipos de Turno

- **TIPO-F01**: Tipos de turno personalizados por profesional desde Configuración
- **TIPO-F02**: Color por tipo de turno en calendario

### CRM

- **CRM-F01**: Vista de pacientes archivados con desarchivar en lote
- **CRM-F02**: Archivado automático tras N días en PERDIDO

### Otros pendientes (PROJECT.md Active)

- Automatizaciones de seguimiento: triggers basados en tiempo/etapa
- Módulos financieros optimizados e interconectados con CRM
- Página pública del paciente: historial, presupuestos, documentos
- Módulo de estadísticas ejecutivas (reportes exportables, comparativas)

## Out of Scope

Exclusiones explícitas. Documentadas para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Modificar otras plantillas de HC | Solo Primera Consulta en este milestone; el resto no cambia |
| Compartir catálogos entre profesionales | Decisión explícita: catálogo por profesional, consistente con catálogos de cirugías/tratamientos |
| Migrar HC históricas al nuevo formato | Las entradas existentes quedan como snapshot; solo entradas nuevas usan la agrupación por zona |

## Traceability

Qué fases cubren qué requisitos.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ZONA-01 | Phase 44 | Complete |
| ZONA-02 | Phase 44 | Complete |
| ZONA-03 | Phase 44 | Complete |
| FORM-01 | Phase 45 | Complete |
| FORM-02 | Phase 45 | Complete |
| FORM-03 | Phase 45 | Complete |
| FORM-04 | Phase 45 | Complete |
| APR-01 | Phase 46 | Complete |
| APR-02 | Phase 46 | Complete |
| APR-03 | Phase 46 | Complete |
| APR-04 | Phase 46 | Complete |
| ADM-01 | Phase 47 | Pending |
| ADM-02 | Phase 47 | Pending |
| ADM-03 | Phase 47 | Pending |

**Coverage:**
- v1.9 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-12*
*Last updated: 2026-06-12 — Traceability complete after roadmap creation*
