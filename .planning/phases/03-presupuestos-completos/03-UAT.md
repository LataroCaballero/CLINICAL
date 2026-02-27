---
status: complete
phase: 03-presupuestos-completos
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-02-27T00:00:00Z
updated: 2026-02-27T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Crear presupuesto con nuevos campos
expected: En el drawer de un paciente, abrí la sección Presupuestos y creá un nuevo presupuesto. El formulario debe mostrar campo "Moneda" (ARS/USD), campo "Fecha de validez", e ítems con un solo campo de precio (precioTotal, sin cantidad ni precio unitario separado). Al guardar, el presupuesto aparece en la lista con el total calculado.
result: pass

### 2. PresupuestosView — estados y badges
expected: En la lista de presupuestos del drawer, cada presupuesto muestra su estado como badge (BORRADOR, ENVIADO, ACEPTADO, RECHAZADO). Un presupuesto con fecha de validez vencida muestra badge "VENCIDO" en color ámbar/amarillo. Se muestra la moneda (ARS o USD) y la fecha de validez si está seteada.
result: issue
reported: "Si, perfecto, lo unico que en la lista de pacientes en /pacientes la columna presupuesto dice siempre 'sin presupuesto'"
severity: major

### 3. Ver PDF inline
expected: Al hacer clic en el botón "Ver PDF" de un presupuesto, se abre un Dialog (modal) con un iframe que muestra el PDF generado directamente en la pantalla — sin abrir nueva pestaña. El PDF debe mostrar los datos del presupuesto con el branding de la clínica (si hay logo configurado) y el desglose de procedimientos con precios.
result: pass

### 4. Descargar PDF desde modal de envío
expected: Al hacer clic en "Enviar" en un presupuesto, se abre el EnviarPresupuestoModal con 3 opciones. La opción "Descargar PDF" genera y descarga el archivo PDF al dispositivo directamente (descarga automática del browser, no abre nueva pestaña).
result: pass

### 5. Enviar presupuesto por email
expected: En el EnviarPresupuestoModal, al expandir la opción "Email", aparece un formulario con campo "Email destino" (pre-rellenado con el email del paciente) y un campo opcional de nota. Al confirmar, el sistema envía el email y muestra confirmación de envío exitoso.
result: pass

### 6. WhatsApp deshabilitado con tooltip
expected: En el EnviarPresupuestoModal, la opción "WhatsApp" aparece visualmente deshabilitada (grayed out). Al pasar el mouse sobre ella, muestra un tooltip con el texto "Próximamente" (o similar). No debe ser clickeable.
result: pass

### 7. Presupuesto queda marcado ENVIADO tras email
expected: Después de enviar el presupuesto por email, al cerrar el modal y volver a la lista de presupuestos en el drawer, el presupuesto debe mostrar estado "ENVIADO" (no BORRADOR). La etapa CRM del paciente en el Kanban debe subir automáticamente a "Presupuesto enviado".
result: pass

### 8. Página pública del presupuesto accesible sin login
expected: Con el backend corriendo, la URL /presupuesto/[token] (donde token es el tokenAceptacion del presupuesto) debe ser accesible sin necesidad de estar autenticado. Muestra los datos del presupuesto: nombre del paciente, procedimientos con precios, total, moneda, y fecha de validez. Tiene botones "Aceptar" y "Rechazar".
result: issue
reported: "no tengo ningun token de aceptacion cargado en la bd"
severity: major

### 9. Paciente acepta — CRM sube a CONFIRMADO
expected: En la página pública /presupuesto/[token], al hacer clic en "Aceptar", el presupuesto cambia a estado ACEPTADO. En el sistema, la etapa CRM del paciente debe subir automáticamente a "Cirugía confirmada" (CONFIRMADO). El coordinador recibe una notificación interna (MensajeInterno).
result: skipped
reason: No hay tokenAceptacion en la BD — depende del issue test 8

### 10. Paciente rechaza — CRM baja a PERDIDO
expected: En la página pública /presupuesto/[token], al hacer clic en "Rechazar", aparece un campo para ingresar el motivo. Al confirmar el rechazo, el presupuesto cambia a estado RECHAZADO y la etapa CRM del paciente baja a PERDIDO. El coordinador recibe una notificación interna.
result: skipped
reason: No hay tokenAceptacion en la BD — depende del issue test 8

## Summary

total: 10
passed: 6
issues: 2
pending: 0
skipped: 2

## Gaps

- truth: "La columna 'presupuesto' en la lista /pacientes muestra el estado del último presupuesto del paciente"
  status: failed
  reason: "User reported: en la lista de pacientes en /pacientes la columna presupuesto dice siempre 'sin presupuesto'"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Al enviar un presupuesto por email, el campo tokenAceptacion queda guardado en la BD en el registro del presupuesto"
  status: failed
  reason: "User reported: no tengo ningun token de aceptacion cargado en la bd"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
