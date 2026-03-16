# Phase 2: Log de Contactos + Lista de Accion - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

El coordinador puede registrar interacciones con cada paciente (llamada, mensaje, presencial) y opera desde una lista diaria priorizada que le dice con quién hablar hoy. Esta fase entrega: log de contactos por paciente + historial visible en el drawer + vista "Lista de Acción" con registro rápido. Integraciones con otros canales (WhatsApp automático) son fase posterior.

</domain>

<decisions>
## Implementation Decisions

### Formulario de registro de contacto
- Disponible desde **ambos lados**: botón en el drawer del paciente y botón en la tarjeta de la Lista de Acción
- Se presenta como **sheet/drawer lateral** (no modal centrado)
- Campos del formulario: tipo de interacción (llamada / mensaje / presencial) + nota libre + fecha (default hoy) + etapa CRM + temperatura + próxima acción (opcional)
- Próxima acción: el coordinador puede elegir **fecha exacta con date picker O intervalo predefinido** (2 días / 1 semana / 2 semanas / 1 mes), ambas opciones disponibles
- CRM y temperatura se pueden cambiar en el mismo form (success criteria #3)

### Historial en el perfil del paciente
- Aparece como **sección siempre visible** en el body del drawer (sin tab separado, accesible con scroll)
- Cada entrada muestra formato compacto: **ícono de tipo + fecha + nota truncada**
- Muestra las **últimas 5 entradas** con link "Ver todo" si hay más
- Indicador de "días desde el último contacto" visible **en ambos lugares**: header del drawer del paciente Y tarjeta de la Lista de Acción

### Vista Lista de Acción
- Vive como **widget en el Dashboard** con link a página completa (`/dashboard/accion` o similar)
- Página completa usa **tarjetas (cards)** por paciente
- Cada card muestra: nombre + días sin contacto + temperatura + botón "Registrar"
- El score de prioridad **no se muestra** en la card (solo determina el orden)
- Al registrar un contacto, el paciente **desaparece de la lista** inmediatamente, pero hay un **contador "Contactados hoy"** visible arriba de la lista

### Registro inline desde la Lista de Acción
- El botón "Registrar" en la card abre el **mismo sheet completo** (todos los campos: tipo + nota + fecha + CRM + temperatura + próxima acción)
- El sheet se abre como **acción independiente** — no abre el drawer del paciente debajo
- Al guardar: el sheet se cierra, el paciente aparece **marcado brevemente** (feedback visual de éxito) y luego desaparece de la lista
- Pre-relleno: **solo la fecha** (hoy); el resto de campos vacíos

### Claude's Discretion
- Diseño exacto del ícono por tipo de contacto (llamada, mensaje, presencial)
- Animación de desaparición de la card al marcar como contactado
- Colores/badges para temperatura (caliente/tibio/frío) en las cards
- Ordenamiento secundario cuando dos pacientes tienen el mismo score de prioridad

</decisions>

<specifics>
## Specific Ideas

- El contador "Contactados hoy" actúa como motivador/progreso para el coordinador — visible arriba de la lista mientras trabaja
- El sheet de registro es el mismo componente en ambos contextos (drawer del paciente + lista de acción), reutilizable

</specifics>

<deferred>
## Deferred Ideas

- Ninguna — la discusión se mantuvo dentro del scope de la fase

</deferred>

---

*Phase: 02-log-de-contactos-lista-de-accion*
*Context gathered: 2026-02-23*
