# Phase 54 — Deferred Items (out of scope)

Discovered during execution but NOT caused by this phase's changes. Logged, not fixed.

## Pre-existing backend ESLint errors (44, repo-wide)

`cd backend && npm run lint` exits non-zero due to 44 pre-existing `@typescript-eslint/no-unused-vars`
errors in files unrelated to Phase 54. The new `paciente-portal/*` files are lint-clean
(`npm run lint | grep paciente-portal` returns nothing).

Affected files (not touched by Phase 54):
- `src/modules/reportes/services/reportes-financieros.service.ts` (`soloVencidas`)
- `src/modules/reportes/services/reportes-operativos.service.ts` (`totalCompletados`)
- `src/modules/stock/dto/create-producto.dto.ts` (`IsPositive`)
- `src/modules/stock/services/inventario.service.ts` (`inventarios`)
- `src/modules/wsaa/wsaa-stub.service.ts` (`_profesionalId`, `_service`, `_certPem`, `_keyPem`, `_ambiente`)
- `src/modules/wsaa/wsaa.service.spec.ts` (`MOCK_SOAP_RESPONSE`)
- (plus others under reportes/stock/wsaa)

Disposition: out of scope per SCOPE BOUNDARY (pre-existing, unrelated files). Address in a
dedicated lint-cleanup pass.
