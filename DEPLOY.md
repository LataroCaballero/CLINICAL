# Deploy a Producción — CLINICAL (VPS)

> **Servidor:** `root@31.97.175.128` (host `srv881065`) · **App backend:** `/var/www/clinical/backend` (pm2 `clinical-backend`, script `dist/main.js`, cwd `/var/www/clinical`)
> **Repo:** `https://github.com/LataroCaballero/CLINICAL.git`
> **SSH:** `ssh -i ~/.ssh/id_vps_andescode root@31.97.175.128`

---

## ⚠️ Estado real al 2026-07-02 (leer antes de deployar)

El deploy NO es un `git pull` directo. Estado actual:

| Cosa | Estado | Implicancia |
|------|--------|-------------|
| Trabajo local | branch `feature/rediseñoPlanillaPrimeraVez`, **201 commits sin pushear** | Hay que `git push` primero |
| `origin/main` vs feature | divergieron desde base `cdece28`; feature +201, main por otra rama | `git pull` en main NO trae la Fase 56 |
| VPS branch | `main` local `d475ed1`, **16 commits atrás de `origin/main`** | main del VPS desactualizado |
| VPS working tree | 159 archivos de frontend en disco pero **255 marcados como "deleted"** por git | `git pull` falla o pisa; el índice/HEAD no matchea el disco |
| Frontend prod | sin `.next`, sin proceso pm2, nginx sin confirmar | El frontend de Fase 56 NO se despliega con pasos solo-backend |

### Decisión requerida antes de continuar
**¿Cómo llega la Fase 56 a prod?**
- **Opción A — Deployar la feature branch** (recomendada dado el desorden): pushear la feature, y en el VPS apuntar a esa branch (fetch + checkout + `reset --hard origin/feature`, previo backup). Abandona los commits divergentes de `main`.
- **Opción B — Mergear feature → main**: merge local (conflictos probables con la divergencia de main), push a main, VPS pullea main.

Y por separado: **¿cómo se sirve el frontend en prod?** (nginx static desde un build, un pm2 de Next, u otro server). Sin eso, el portal de firma no queda online.

---

## Pre-deploy (una sola vez, desde la máquina de desarrollo)

```bash
# 1. Pushear la feature branch (201 commits pendientes)
cd /Users/laucaballero/Desktop/Lautaro/AndesCode/CLINICAL
git push origin feature/rediseñoPlanillaPrimeraVez
```

Luego resolver la **decisión de branch** (A o B) — el resto del runbook asume Opción A.

---

## Backend — deploy (Opción A: feature branch)

```bash
ssh -i ~/.ssh/id_vps_andescode root@31.97.175.128
pm2 stop clinical-backend
cd /var/www/clinical

# --- Reconciliar el working tree roto del VPS (BACKUP primero) ---
git stash push -u -m "vps-pre-deploy-$(date +%s)" || true   # respalda cambios locales
git fetch origin
git checkout feature/rediseñoPlanillaPrimeraVez || git checkout -b feature/rediseñoPlanillaPrimeraVez origin/feature/rediseñoPlanillaPrimeraVez
git reset --hard origin/feature/rediseñoPlanillaPrimeraVez   # DESTRUCTIVO: alinea disco = branch

cd backend
rm -f tsconfig.build.tsbuildinfo
rm -rf dist/
npm install
npx prisma migrate deploy      # aplica migraciones pendientes (incl. 56-01 si no está)
npx prisma generate
npm run build
pm2 restart clinical-backend
pm2 logs clinical-backend --lines 40   # verificar arranque OK
```

> **Nota migración Fase 56:** `20260701000000_signed_consent_forensic` ya fue aplicada a la BD Supabase durante el desarrollo. `prisma migrate deploy` la detectará como aplicada (no la re-corre). Confirmar que no hay drift.

> **BACKEND_URL:** para que el PDF firmado sea accesible y la IP forense salga del `x-forwarded-for` real (no `127.0.0.1`), verificar que el `.env` del VPS tenga `BACKEND_URL` con la URL pública y que nginx pase `X-Forwarded-For`.

## Frontend — deploy (COMPLETAR según cómo se sirva)

```bash
cd /var/www/clinical/frontend
npm install
npm run build            # requiere Node >= 20.9 (local dev usa 18; el VPS debe tener >=20)
# luego, según el método de serving:
#  - pm2 (Next server):   pm2 restart clinical-frontend   # (no existe hoy — crear si aplica)
#  - nginx static/proxy:  recargar nginx / apuntar al nuevo build
```

---

## Tu paso a paso original (solo-backend, asumía main limpio — NO usar tal cual)

```
pm2 stop clinical-backend
cd /var/www/clinical
rm backend/tsconfig.build.tsbuildinfo
git pull                 # ⚠️ en main NO trae Fase 56 + falla por working tree sucio
cd backend
rm -rf dist/
rm tsconfig.build.tsbuildinfo
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart clinical-backend
```

**Por qué no sirve tal cual:** (1) el VPS está en `main`, la Fase 56 está en la feature branch; (2) working tree del VPS sucio → `git pull` aborta; (3) no cubre el frontend. Ver la versión corregida arriba.

---

## Post-deploy — verificación

```bash
# backend arriba
pm2 status clinical-backend
# endpoints de consentimiento existen (deberían responder 401 sin JWT, no 404)
curl -si https://<BACKEND_URL>/paciente-portal/public/consentimiento | head -1   # 401 esperado
# smoke test firma end-to-end desde el portal + revisar PDF forense en uploads/{profesionalId}/
```
