# Coding Conventions

**Analysis Date:** 2026-02-21

## Naming Patterns

**Files:**
- Controllers: `{feature}.controller.ts` (e.g., `pacientes.controller.ts`)
- Services: `{feature}.service.ts` (e.g., `pacientes.service.ts`)
- Modules: `{feature}.module.ts` (e.g., `pacientes.module.ts`)
- DTOs: `{action}-{entity}.dto.ts` (e.g., `create-paciente.dto.ts`, `update-paciente.dto.ts`)
- Specifications: `{feature}.spec.ts` (e.g., `pacientes.service.spec.ts`)
- Utilities: descriptive names in `src/common/` (e.g., `resolve-scope.ts`, `sanitize-empty-values.pipe.ts`)
- Hooks (Frontend): `use{Entity}{Action}.ts` (e.g., `useObrasSociales.ts`, `usePacienteSuggest.ts`)

**Functions:**
- Service methods: camelCase, verb-first pattern
  - `create()`, `findAll()`, `findOne()`, `update()`, `delete()`
  - Query/retrieval methods: `obtenerListaPacientes()`, `getKanban()`, `getDashboardKPIs()`
  - Specific actions: `getOrCreateCuentaCorriente()`, `suggest()`, `updatePacienteSection()`
- Private utilities: prefixed with underscore in some cases (e.g., `_generateRefreshToken()`)

**Variables:**
- camelCase for local variables and parameters
- Constants in `UPPER_SNAKE_CASE` in dedicated constant files (e.g., `ESTADO_PRIORITY` in `pacientes.constants.ts`)
- DTO/Database fields: snake_case in database, mapped to camelCase in TypeScript
  - Example: `fechaNacimiento` (TypeScript) → `fecha_nacimiento` (database)
- Boolean flags: prefixed with `is`, `has`, `can` (e.g., `isRefreshing`, `_retry`)

**Types/Interfaces:**
- PascalCase for all type names
- DTOs: suffixed with `Dto` (e.g., `CreatePacienteDto`, `UpdatePacienteDto`)
- Enums from Prisma: imported directly and used as-is (e.g., `EstadoPaciente`, `RolUsuario`, `EtapaCRM`)
- Type interfaces: descriptive PascalCase (e.g., `ResolveScopeParams`, `PacienteSuggest`)

## Code Style

**Formatting:**
- Tool: Prettier
- Configuration in `backend/.prettierrc`:
  - Single quotes (`singleQuote: true`)
  - Trailing commas (`trailingComma: "all"`)
- Run: `npm run format`

**Linting:**
- Tool: ESLint with TypeScript plugin
- Configuration: `backend/.eslintrc.js`
- Rules applied:
  - `@typescript-eslint/recommended` preset
  - `plugin:prettier/recommended` for style integration
  - Relaxed rules: no interface prefix requirement, no explicit return types required
- Run: `npm run lint` (runs with auto-fix)

**Indentation:**
- 2 spaces (enforced by Prettier)

## Import Organization

**Order (enforced by convention):**
1. NestJS core imports (`@nestjs/common`, `@nestjs/core`, etc.)
2. Third-party packages (`bcrypt`, `axios`, `class-validator`, etc.)
3. Prisma imports (`@prisma/client`)
4. Local imports (relative paths or `@/` alias)

**Path Aliases:**
- Backend: `@/*` points to `src/` (e.g., `@/src/prisma/prisma.service`)
- Frontend: `@/*` points to `src/` (e.g., `@/lib/api`, `@/hooks/useObrasSociales`)

## Error Handling

**Patterns:**
- NestJS built-in exceptions: `NotFoundException`, `ConflictException`, `InternalServerErrorException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`
- Catch blocks: specific error handling for Prisma errors (e.g., `P2002` for unique constraint violations)
  - Example: Check `error.code === 'P2002'` before throwing `ConflictException`
- Custom filter for Prisma errors: `PrismaClientExceptionFilter` extends `BaseExceptionFilter`
  - Located in `backend/src/prisma-client-exception/prisma-client-exception.filter.ts`
- Error logging: `console.log()` or `console.error()` used for debugging (not production-ready)
- In services: wrap operations in try-catch, throw specific HTTP exceptions

**Example pattern from `pacientes.service.ts`:**
```typescript
try {
  const data = { ...dto, fechaNacimiento: new Date(dto.fechaNacimiento) };
  return this.prisma.paciente.create({ data });
} catch (error: any) {
  if (error.code === 'P2002' && error.meta?.target?.includes('dni')) {
    throw new ConflictException('El DNI ingresado ya está registrado.');
  }
  throw new InternalServerErrorException('Error interno al crear paciente');
}
```

## Logging

**Framework:** Native `console` object

**Patterns:**
- Development: `console.log()` for debugging (prefixed with descriptive text)
- Example from `pacientes.service.ts`: `console.log('DTO RECIBIDO:', dto)`
- Error logs: `console.error()` or `console.log('ERROR CAPTURADO EN CATCH:', error)`
- No centralized logging service detected; best practice would recommend migrating to Winston or similar

## Comments

**When to Comment:**
- Comments provided for complex business logic or non-obvious implementations
- Inline comments explain "why" not "what" (code is self-documenting where possible)
- Comments in Spanish (matching codebase language)

**JSDoc/TSDoc:**
- Used sporadically in backend services for public methods
- Pattern from `cuentas-corrientes-proveedores.service.ts`:
  ```typescript
  /**
   * Obtiene o crea la cuenta corriente de un proveedor
   */
  async getOrCreateCuentaCorriente(proveedorId: string, profesionalId: string)
  ```
- Limited usage; not enforced across codebase

## Function Design

**Size:**
- Services methods average 20-40 lines
- Larger complex methods (e.g., `obtenerListaPacientes()`) can extend to 100+ lines with nested queries

**Parameters:**
- Single object parameters with DTOs (e.g., `create(dto: CreatePacienteDto)`)
- Spread objects for transformations (e.g., `const data = { ...dto, fechaNacimiento: new Date(...) }`)
- Optional filters passed as object with optional properties (e.g., `filters?: { profesionalId?: string; soloConDeuda?: boolean }`)

**Return Values:**
- Service methods return Prisma results directly or transformed objects
- Controllers return service results (NestJS handles serialization)
- Query hooks return TanStack Query results (frontend)
- Async/await consistently used; no `.then()` chains

## Module Design

**Exports:**
- Controllers are registered in module declaration
- Services are provided in module providers
- Decorators used for role-based access control (e.g., `@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')`)

**Example from `pacientes.module.ts`:**
```typescript
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PacientesController],
  providers: [PacientesService, SeguimientoSchedulerService, PrismaService],
})
export class PacientesModule {}
```

**Barrel Files:**
- DTOs exported from `dto/` directories (implicit star exports used)
- Services exported directly from module

**NestJS Decorators:**
- `@Injectable()` for services
- `@Module()` for modules
- `@Controller()` for controllers with route prefix
- `@Get()`, `@Post()`, `@Patch()`, `@Delete()` for HTTP methods
- `@Param()`, `@Body()`, `@Query()`, `@Header()`, `@Req()` for parameter injection
- `@UsePipes()` for applying validation/transformation pipes

## Frontend-Specific Conventions

**React Hooks:**
- Custom hooks use `useQuery` and `useMutation` from TanStack Query
- Pattern:
  ```typescript
  export function useObrasSociales() {
    return useQuery({
      queryKey: ["obrasSociales"],
      queryFn: async () => {
        const res = await api.get("/obras-sociales");
        return res.data;
      },
    });
  }
  ```

**Component Naming:**
- PascalCase (e.g., `Button`, `AppointmentDetailModal`)
- Descriptive names indicating component type (Modal, Widget, Card, etc.)

**Styling:**
- Tailwind CSS for utility classes
- `class-variance-authority` (CVA) for component variants
- `cn()` utility function for conditional class merging (from `@/lib/utils`)

**API Client:**
- Centralized axios instance in `frontend/src/lib/api.ts`
- Automatic JWT token injection via request interceptor
- Token refresh logic with queue for concurrent requests
- All API calls use the `api` object, not raw `fetch`

## Validation

**Backend:**
- `class-validator` decorators in DTOs
- Decorators: `@IsString()`, `@IsOptional()`, `@IsArray()`, `@IsDateString()`, `@IsBoolean()`, `@IsEnum()`
- Example from `create-paciente.dto.ts`:
  ```typescript
  @IsString()
  nombreCompleto: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;
  ```

**Frontend:**
- Zod schemas for form validation (implied by CLAUDE.md)
- React Hook Form integration with Zod resolvers

---

*Convention analysis: 2026-02-21*
