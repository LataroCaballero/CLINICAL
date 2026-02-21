# Technology Stack

**Analysis Date:** 2026-02-21

## Languages

**Primary:**
- TypeScript 5.1.3 - Used in both backend and frontend
- JavaScript (Node.js runtime)

**SQL:**
- PostgreSQL - Primary database via Prisma

## Runtime

**Environment:**
- Node.js 20.19.6 (via NVM)

**Package Manager:**
- npm - Package management for both backend and frontend
- Lockfile: `package-lock.json` present in both `/backend` and `/frontend`

## Frameworks

**Backend:**
- NestJS 10.0.0 - REST API framework with modular architecture
- Prisma 6.1.0 - ORM and database abstraction
- Passport 0.7.0 - Authentication middleware
- @nestjs/jwt 11.0.1 - JWT token handling
- @nestjs/passport 11.0.5 - Passport integration
- @nestjs/schedule 6.1.0 - Task scheduling (cron jobs)
- @nestjs/throttler 6.4.0 - Rate limiting

**Frontend:**
- Next.js 16.0.7 - React framework with App Router
- React 19.2.0 - UI library
- React DOM 19.2.0 - DOM rendering
- TanStack Query (React Query) 5.90.6 - Server state management and data fetching
- TanStack Table 8.21.3 - Data table library
- Zustand 5.0.8 - Client state management with localStorage persistence
- React Hook Form 7.68.0 - Form state management
- Zod 4.1.13 - Schema validation
- Framer Motion 12.23.25 - Animation library
- Motion 12.23.24 - Animation primitives
- TipTap 3.10.5 - Rich text editor

## UI Components

**Frontend:**
- shadcn/ui - Headless component library
- Radix UI 1.x - Primitive components (Dialog, Popover, Select, Tabs, etc.)
- Tailwind CSS 4 - Utility-first CSS framework
- Lucide React 0.553.0 - Icon library
- Sonner 2.0.7 - Toast notifications
- React Big Calendar 1.19.4 - Calendar component
- React Day Picker 9.12.0 - Date picker
- Yet Another React Lightbox 3.25.0 - Image lightbox
- ReactFlow 11.11.4 - Node-based diagram library
- Recharts 3.3.0 - Data visualization (charts, graphs)
- Signature Pad 5.1.1 - Digital signature capture
- Vaul 1.1.2 - Drawer component

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Drag and drop toolkit
- @dnd-kit/sortable 10.0.0 - Sortable list support
- @dnd-kit/utilities 3.2.2 - Utilities

## Key Dependencies

**Backend Core:**
- @nestjs/common 10.0.0 - NestJS core utilities
- @nestjs/core 10.0.0 - NestJS core framework
- @nestjs/platform-express 10.0.0 - Express integration
- @nestjs/config 4.0.2 - Environment configuration management
- @nestjs/cache-manager 3.0.1 - Caching support
- @prisma/client 6.1.0 - Prisma database client

**Backend Utilities:**
- bcrypt 6.0.0 - Password hashing
- axios 1.13.1 - HTTP client for internal/external API calls
- nodemailer 7.0.13 - Email sending service
- date-fns 4.1.0 - Date manipulation utilities
- dotenv 17.2.3 - Environment variable loading
- faker 6.6.6 - Fake data generation
- pdfkit 0.17.2 - PDF document generation
- redis 5.9.0 - Redis client
- cache-manager-redis-yet 5.1.5 - Redis cache adapter
- pg 8.16.3 - PostgreSQL client

**Backend Validation & Serialization:**
- class-validator 0.14.2 - Data validation decorators
- class-transformer 0.5.1 - Data transformation decorators
- @nestjs/mapped-types 2.1.0 - DTO type mapping

**Frontend Data:**
- axios 1.13.1 - HTTP client for API requests
- moment 2.30.1 - Date/time manipulation (legacy)

**Frontend Utilities:**
- clsx 2.1.1 - Conditional class name utility
- class-variance-authority 0.7.1 - Component variant library
- tailwind-merge 3.4.0 - Tailwind CSS class merging
- cmdk 1.1.1 - Command palette component
- @hookform/resolvers 5.2.2 - Form validation resolvers

## Development Tools

**Backend:**
- Jest 29.5.0 - Testing framework
- Supertest 7.0.0 - HTTP assertion library
- ts-jest 29.1.0 - Jest TypeScript support
- ts-node 10.9.1 - TypeScript execution
- ts-loader 9.4.3 - Webpack TypeScript loader
- ESLint 8.0.0 - Linting
- Prettier 3.0.0 - Code formatting
- @typescript-eslint/parser 8.0.0 - TypeScript ESLint support
- @typescript-eslint/eslint-plugin 8.0.0 - TypeScript ESLint rules
- Prisma CLI 6.1.0 - Database migrations and management
- @mermaid-js/mermaid-cli 11.12.0 - Diagram generation
- @faker-js/faker 10.1.0 - Advanced fake data generation

**Frontend:**
- ESLint 9 - Linting
- babel-plugin-react-compiler 1.0.0 - React compiler optimization
- TypeScript 5 - Type checking

## Configuration

**Environment:**
- Backend: `.env` file in `backend/` directory
  - `DATABASE_URL` - PostgreSQL connection string (with pgBouncer settings: `connection_limit=1&pool_timeout=30`)
  - `JWT_SECRET` - JWT signing secret
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email configuration
  - `PORT` - Server port (default: 3001)

- Frontend: Environment variables prefixed with `NEXT_PUBLIC_`
  - `NEXT_PUBLIC_API_URL` - Backend API base URL

**TypeScript:**
- Backend: `backend/tsconfig.json` - Node.js target, ES2021
- Frontend: `frontend/tsconfig.json` - Browser targets, ES2017
- Path alias `@/*` in both for imports

**Code Quality:**
- Backend: ESLint with Prettier integration (`.eslintrc.js`, `.prettierrc`)
- Frontend: ESLint with Next.js config (`eslint.config.mjs`)

**Build:**
- Backend: NestJS CLI (`nest build`) → `dist/` directory
- Frontend: Next.js build system → `.next/` directory

## Platform Requirements

**Development:**
- Node.js 20.19.6 or compatible
- PostgreSQL database (local or remote)
- Optional: Redis for caching

**Production:**
- Node.js 20.x LTS
- PostgreSQL database
- SMTP server for email delivery
- Optional: Redis instance
- Optional: File storage (S3, CDN, or local filesystem)

## Compiler & Transpilation

- TypeScript 5.1.3 compilation to JavaScript
- Backend: ts-jest for tests, ts-loader for webpack
- Frontend: Babel (via Next.js) with React Compiler optimization
- Next.js Server Components and Client Components support

---

*Stack analysis: 2026-02-21*
