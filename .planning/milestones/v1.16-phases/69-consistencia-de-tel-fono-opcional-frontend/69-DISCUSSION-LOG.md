# Phase 69: Consistencia de Teléfono Opcional (Frontend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 69-Consistencia de Teléfono Opcional (Frontend)
**Areas discussed:** las 4 áreas presentadas fueron delegadas en bloque a Claude — no hubo deep-dive por área

---

## Selección de áreas (única pregunta respondida)

| Option | Description | Selected |
|--------|-------------|----------|
| Forma del placeholder | TEL-03: `-` (ya usado en 2 sitios), `—`, o "Sin teléfono"; qué pasa en el autosuggest; uniforme vs por sitio (el link `tel:` de ListaEsperaSheet no puede quedar clickeable) | |
| Formularios de teléfono | TEL-02 en NewPacienteModal; y si entra también DatosCompletos.tsx:106, donde el bloque Contacto sigue exigiendo ≥6 aunque el backend ya lo relajó (67 D-05) | |
| Alcance botones WA | ENVIO-03: cuáles de los 5 call sites de envío; dos no reciben `telefono` hoy y hay que plumbearlo | |
| Tooltip y precedencia | Qué dice el tooltip cuando faltan teléfono y opt-in a la vez; el texto actual se repite literal en 4 archivos | |
| **Other (free text)** | **"Quiero que decidas todo vos con las mejores opciones"** | **✓** |

**User's choice:** delegación completa de las cuatro áreas.
**Notes:** el usuario no acotó ni vetó ninguna de las cuatro áreas presentadas; la delegación es sobre el conjunto tal como se le presentó, incluidas las dos preguntas de alcance que estaban abiertas dentro de ellas (¿entra `DatosCompletos.tsx`? ¿entran los 5 call sites?). No se abrió alcance nuevo.

---

## Claude's Discretion

Las cuatro áreas completas. Las 17 decisiones resultantes (D-01..D-17 en CONTEXT.md) se tomaron contra el código real verificado durante el scout, no por preferencia abstracta. Las que tenían alternativa genuina y cómo se resolvieron:

| Decisión | Alternativas consideradas | Resuelto | Razón |
|---|---|---|---|
| D-01 placeholder | `—` (el ejemplo de REQUIREMENTS.md) vs `-` (el que ya usa el repo) vs "Sin teléfono" | `-` | Dos sitios existentes ya lo usan; `—` obligaría a tocarlos sólo por consistencia |
| D-03 autosuggest | `Tel: -` vs caer el segmento entero | Caer el segmento | Subtítulo de un renglón en popover angosto; el dato no es accionable ahí |
| D-05 reportes | `render` por columna vs default en `TablaReporte` | `render` por columna | `TablaReporte` lo consumen ~6 reportes; un default global tocaría columnas ajenas |
| D-06 tabla pacientes | Agregar columna de teléfono vs no tocarla | No tocarla | Verificado: no existe tal columna. Agregarla sería scope creep disfrazado de compliance |
| D-09 ficha | Sólo display (lectura literal de TEL-03) vs relajar también el Zod de edición | Relajar también | Sin eso, 67 D-05 queda como trabajo muerto y un paciente creado inline no puede editar su contacto |
| D-11 alcance WA | 4 controles vs incluir `SendWAMessageModal` | 4 controles | El modal sólo se abre desde dos sitios ya guardeados; un guard ahí sería defensa muerta |
| D-13 calendario | Sacar el calendario del alcance vs incluir 1 línea de backend | Incluir la línea | Sin ensanchar el `select` de `obtenerTurnosPorRango`, el botón queda deshabilitado para *todos* — falso negativo total |
| D-14 precedencia | Teléfono gana vs opt-in gana vs mensaje combinado | Teléfono gana | Es el prerequisito; pedir opt-in a quien no podés escribirle no destraba nada |
| D-16 texto | Replicar el mensaje largo del backend vs frase corta propia | Frase corta | Un tooltip no es un toast; y en la ficha "agregá un teléfono en su ficha" sería redundante |

## Deferred Ideas

Ninguna surgió de la conversación. Las que rozó el análisis y quedan afuera están listadas en `<deferred>` de CONTEXT.md: ENVIO-F01, ENVIO-F02, guard en `SendWAMessageModal`, formateo del número en `formatTelefono`, FICHA-F01/F02.
