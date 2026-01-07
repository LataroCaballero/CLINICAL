# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Medical clinic management system (SaaS multi-tenant) for aesthetic surgery practices. Manages appointments, clinical records, inventory, finances, and patient communication.

## Tech Stack

- **Backend:** NestJS + Prisma + PostgreSQL
- **Frontend:** Next.js 16 + React 19 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Radix primitives
- **State:** Zustand (persisted stores in `frontend/src/store/`)
- **Data Fetching:** TanStack Query (hooks in `frontend/src/hooks/`)
- **Forms:** React Hook Form + Zod
- **Auth:** JWT with refresh tokens stored in localStorage

## Development Commands

### Backend (from `backend/` directory)
```bash
npm run start:dev       # Development with watch mode
npm run build           # Build for production
npm run start:prod      # Run production build
npm run lint            # ESLint with auto-fix
npm run test            # Run Jest tests
npm run test:watch      # Tests in watch mode
npm run test:e2e        # E2E tests
npx prisma migrate dev  # Run database migrations
npx prisma generate     # Regenerate Prisma client
```

### Frontend (from `frontend/` directory)
```bash
npm run dev             # Development server on port 3000
npm run build           # Production build
npm run lint            # ESLint
```

## Architecture

### Backend Structure
```
backend/src/
├── modules/            # Feature modules (NestJS pattern)
│   ├── auth/           # JWT authentication
│   ├── pacientes/      # Patient management
│   ├── turnos/         # Appointment scheduling
│   ├── historia-clinica/  # Clinical records
│   ├── profesionales/  # Medical professionals
│   ├── usuarios/       # User management
│   ├── obras-sociales/ # Health insurance
│   ├── tipos-turno/    # Appointment types
│   └── tratamientos/   # Treatments catalog
├── prisma/             # Prisma schema and module
│   └── schema.prisma   # Database schema
├── common/             # Shared middleware, guards, decorators
└── app.module.ts       # Root module
```

Each module follows NestJS conventions: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto/`.

### Frontend Structure
```
frontend/src/
├── app/                # Next.js App Router pages
│   ├── dashboard/      # Protected dashboard routes
│   │   ├── pacientes/  # Patient management
│   │   ├── turnos/     # Appointments calendar
│   │   ├── finanzas/   # Finance (billing, payments)
│   │   └── stock/      # Inventory management
│   └── login/          # Auth pages
├── components/         # React components
│   ├── ui/             # shadcn/ui base components
│   └── patient/        # Patient-specific components
├── hooks/              # TanStack Query hooks (useQuery/useMutation)
├── lib/
│   ├── api.ts          # Axios instance with auth interceptor
│   └── utils.ts        # Utility functions
├── store/              # Zustand stores
├── types/              # TypeScript types
└── schemas/            # Zod validation schemas
```

### Key Patterns

**API Client:** All API requests use the axios instance from `frontend/src/lib/api.ts` which automatically attaches JWT tokens from localStorage.

**Data Hooks:** Each data entity has dedicated hooks in `frontend/src/hooks/` following the pattern:
- `usePacientes.ts` - List queries
- `usePaciente.ts` - Single item query
- `useCreatePaciente.ts` - Mutation hook

**Professional Context:** The system filters data by professional. Use `useProfessionalContext` store and `useEffectiveProfessionalId` hook to get the current professional context.

**Database Schema:** Located at `backend/src/prisma/schema.prisma`. Key models:
- `Usuario` - Base user with roles (ADMIN, PROFESIONAL, SECRETARIA, PACIENTE, FACTURADOR)
- `Paciente` - Patient with medical history, insurance, and appointments
- `Profesional` - Medical professional linked to a user
- `Turno` - Appointments with types and states
- `HistoriaClinica` / `HistoriaClinicaEntrada` - Clinical records

## Environment Variables

Backend requires `.env` with:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

Frontend requires:
- `NEXT_PUBLIC_API_URL` - Backend API base URL

## Git Workflow

Uses GitFlow: `main` (stable), `develop` (active development), `feature/*` branches.

## How to work (token-efficient)
- Antes de proponer cambios, ubicá archivos reales con `rg`/búsquedas acotadas. Evitá leer carpetas grandes.
- Pedime 1–3 archivos puntuales si el contexto no alcanza; no hagas “repo-wide dumps”.
- Respuestas: primero plan corto (3–6 bullets), luego *solo* el diff/código mínimo necesario.
- Si el cambio es grande: dividir en PRs lógicos (frontend / backend / prisma).

## Quality bar
- No romper tipos, lint ni tests existentes.
- Respetar patrones del repo (DTOs, services, modules, naming, UI components).
- Mantener multi-tenant/roles cuando aplique (Admin/Profesional/Secretaria/Paciente/Facturador).

## Security
- Nunca leer `.env*`, secretos o credenciales. Si falta config, pedime valores “shape” (nombres de env vars), no los valores.

## Current focus areas
- Módulos: Pacientes, Historia Clínica, Obras Sociales/Planes, Turnos, Finanzas.