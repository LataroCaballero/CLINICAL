# Phase 54: Portal Backend + Token Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 54-portal-backend-token-security
**Areas discussed:** Mecanismo de bloqueo DNI, Modelo de sesión post-DNI, Contenido del DTO de lectura, Superficie de endpoints F54 vs F55

---

## Mecanismo de bloqueo DNI

### ¿Dónde y cómo trackeamos los intentos fallidos (3 en 15 min → 429)?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Columnas en Paciente | `portalIntentosFallidos` + `portalBloqueadoHasta`; persistente, auditable, multi-instancia; migración pequeña | ✓ |
| En memoria (Map por token-hash) | Cero schema, simple, pero se pierde al reiniciar y no multi-instancia | |
| ThrottlerGuard custom | Reusa infra de throttling, pero storage default in-memory igual | |

### ¿Cómo se desbloquea?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Auto tras 15 min | La ventana expira sola | |
| Auto + reset al verificar OK | Expiry 15 min + DNI correcto resetea contador a 0 | ✓ |
| También desbloqueo manual por staff | Endpoint + UI extra; posible otra fase | |

### ¿Por qué clave se cuenta el bloqueo?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Por token | Literal al SC#2 ("mismo token dentro de 15 minutos") | ✓ |
| Por token + IP | Más resistente pero el SC sólo pide token; IP tras proxy agrega complejidad | |

**Notes:** El SC#2 fija el comportamiento; sólo se decidió el mecanismo. Reusar normalización de DNI de `presupuestos.service.verificarYCargar`.

---

## Modelo de sesión post-DNI

### ¿Cómo se autorizan los requests tras verificar DNI?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| JWT de portal corto | Emitido en POST /verificar, scopeado a pacienteId; DNI no se repite, token UUID no es credencial de escritura | ✓ |
| Stateless: token+DNI cada request | Estilo presupuestos; complica el bloqueo de 3 intentos | |
| Solo token UUID alcanza | Simple pero el token crudo se vuelve credencial de escritura completa | |

### ¿Qué pasa si vence el JWT durante el wizard?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Re-verificar DNI | Ante 401, el front re-pide DNI y re-emite JWT; sin refresh token | ✓ |
| TTL largo (24h) | Menos fricción pero ventana de credencial más amplia | |
| Lo decidís vos | TTL/refresh a criterio del planner | |

**Notes:** Reusar `JwtService`/patrón de auth existente, con claim/scope que distinga portal-paciente de staff.

---

## Contenido del DTO de lectura

### ¿Qué devuelve el GET pre-verificación?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo nombre + estado | nombreCompleto + flag válido/bloqueado | |
| Nada — solo 200/404 | Confirma existencia del token, sin datos; nombre recién tras verificar | ✓ |
| Lo decidís vos | A criterio del planner | |

### ¿Qué datos personales editables expone el DTO post-verificación?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Contacto editable + read-only ctx | Editables: tel/email/dirección/contacto emergencia; read-only: nombre/DNI/obra social/cirugía | ✓ |
| Solo campos editables | Únicamente los 4 editables, sin contexto | |

### ¿Devuelve los valores staged ya auto-reportados?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sí, devolver staged | Pre-carga el paso de salud; nunca devuelve los curados | ✓ |
| No, salud siempre en blanco | Re-declara cada vez; pierde lo cargado antes | |

**Notes:** PORTAL-04 — nunca exponer obra social ni clínicos. Nunca filtrar `alergias[]`/`condiciones[]` curados.

---

## Superficie de endpoints F54 vs F55

### ¿Qué endpoints de escritura entran en F54?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Datos personales + salud staged | Backend completo: PATCH contacto + POST/PATCH salud staged; F55 sólo arma el wizard | ✓ |
| Solo verificar + GET + datos personales | POST de salud cae en F55 (parte SC#4 también) | |
| Todos los endpoints del wizard | Incluiría CHAT-04, que está mapeado a F56 — adelanta scope | |

### ¿El PATCH de datos personales es completo o parcial?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Parcial, solo whitelisted | 4 campos opcionales; ValidationPipe whitelist descarta el resto | ✓ |
| Reemplazo completo de los 4 | Obliga al front a reenviar todo siempre | |

### ¿Comportamiento ante un campo prohibido en el body?
| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Ignorar silenciosamente | whitelist:true sin forbidNonWhitelisted; coincide con "es ignorado" del SC#3 | ✓ |
| Rechazar con 400 | forbidNonWhitelisted; contradice el "ignorado" del SC#3 | |

**Notes:** CHAT-04 (consulta al médico) explícitamente diferido a F56.

---

## Claude's Discretion

- TTL exacto del JWT de portal (sug. 30–60 min) y mecánica de claims/scope.
- Nombre del módulo NestJS (`paciente-portal` sugerido) y rutas exactas.
- Si el GET pre-verificación devuelve además el flag de bloqueo para UX del 429.
- Shape exacto del `Json` de `antecedentesAutoReportados`.
- Formato del cuerpo de la respuesta 429 (mensaje + retryAfter/bloqueadoHasta).
- Edge case "paciente sin DNI cargado" al verificar — resolver de forma segura.

## Deferred Ideas

- Desbloqueo manual del 429 por staff — fuera de F54.
- Bloqueo combinado token + IP — descartado (SC sólo pide token).
- Endpoint de consulta al médico (CHAT-04) — Phase 56.
- Refresh token del JWT de portal — descartado (se re-verifica DNI al expirar).
