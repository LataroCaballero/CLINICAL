# Sistema de Gestión de Consultorios — Cirugía Estética (v2.0)

Sistema web integral para la **gestión de turnos, historias clínicas, stock, finanzas y comunicación** de consultorios médicos de cirugía estética.

---

## 🚀 Descripción General

Este sistema permite a clínicas y profesionales administrar eficientemente su operación diaria desde una plataforma web moderna y responsive.  
Incluye gestión completa de pacientes, historias clínicas digitales, control financiero y stock, reportes y analíticas.

---

## 🧱 Arquitectura General

El sistema está diseñado bajo una **arquitectura SaaS multi-tenant**, dividiendo responsabilidades en tres capas:

- **Frontend:** Next.js + React  
- **Backend:** NestJS (Node.js) + Prisma  
- **Base de Datos:** PostgreSQL  
- **Infraestructura:** Vercel (frontend) + Railway/Render (backend)

```
Cliente (Web)
   │
   ▼
API Gateway (REST / GraphQL)
   │
   ▼
Backend (NestJS + Prisma + PostgreSQL)
   │
   ├── Redis (Cache)
   ├── Cloudinary (Archivos)
   ├── Twilio / Resend (Comunicaciones)
   └── Supabase (DB Hosting)
```

---

## ⚙️ Stack Tecnológico

### Backend
- **Framework:** Node.js + NestJS  
- **ORM:** Prisma  
- **Base de Datos:** PostgreSQL  
- **Autenticación:** JWT + Refresh Tokens  
- **Cache:** Redis  
- **Testing:** Jest + Supertest  
- **Integraciones:** Twilio, Resend, Cloudinary, Google Calendar API

### Frontend
- **Framework:** React 18 + Next.js 14  
- **Lenguaje:** TypeScript  
- **UI:** Tailwind CSS + shadcn/ui  
- **Estado:** Zustand  
- **Formularios:** React Hook Form + Zod  
- **Fetching:** TanStack Query  
- **Tablas:** TanStack Table  
- **Gráficos:** Recharts  
- **Calendario:** FullCalendar / React Big Calendar  
- **Testing:** Vitest + RTL  

### Infraestructura
- **Hosting:** Vercel (frontend), Railway/Render (backend)  
- **DB:** Supabase / Railway PostgreSQL  
- **Archivos:** Cloudinary / AWS S3  
- **Emails:** Resend / SendGrid  
- **CI/CD:** GitHub Actions  
- **Monitoreo:** Sentry + Vercel Analytics  

---

## 🌿 Estrategia de Ramas (GitFlow)

### 🔹 Rama principal
- **`main`** — versión estable y desplegable  
  - Se actualiza solo mediante PR desde `develop` revisados y aprobados.  
  - Cada merge genera una **release tag** (`v1.0.0`, `v1.1.0`, etc.).

### 🔹 Rama de desarrollo
- **`develop`** — base de desarrollo activo  
  - Nacen todas las ramas `feature/*`.  
  - Se fusiona con `main` para cada versión estable.

### 🔹 Ramas de características
- **`feature/*`** — desarrollo de funcionalidades específicas  
  - Ejemplo: `feature/auth-login`, `feature/patient-module`, `feature/financial-dashboard`  
  - Se crean desde `develop` y se fusionan mediante PR.

### 🔹 Opcionales
- **`hotfix/*`** — corrección de errores críticos en producción  
- **`release/*`** — estabilización previa a una nueva versión  

---

## 🪴 Estructura del Repositorio

```
root/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── prisma/
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── docs/
│   ├── requisitos.pdf
│   ├── arquitectura.md
│   ├── endpoints.md
│   └── roadmap.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
└── README.md
```

---

## 🧠 Guía para Desarrolladores

### Clonar el repositorio
```bash
git clone https://github.com/LataroCaballero/clinical.git
cd clinical
```

### Configurar entorno
Copiar `.env.example` → `.env` y definir variables:
```
DATABASE_URL="postgresql://user:password@localhost:5432/clinic"
JWT_SECRET="supersecretkey"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

### Instalar dependencias
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Ejecutar entorno local
```bash
# Backend
cd backend
npx prisma migrate dev
npm run start:dev

# Frontend
cd ../frontend
npm run dev
```

### Testing
```bash
npm run test
```

---

## 🧾 Licencia

Proyecto propiedad de **AndesCode**  
© 2025 — Todos los derechos reservados.
