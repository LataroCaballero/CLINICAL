# Testing Patterns

**Analysis Date:** 2026-02-21

## Test Framework

**Runner:**
- Jest
- Configuration: `backend/test/jest-e2e.json` for E2E tests (no dedicated jest.config.js; uses NestJS defaults)

**Assertion Library:**
- Jest built-in matchers (`expect()`)

**Run Commands:**
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:debug       # Debug with Node inspector
npm run test:e2e         # E2E tests with jest-e2e.json config
```

**Test Environment:**
- Node.js (`testEnvironment: "node"`)
- ts-jest for TypeScript transformation
- Supports `@nestjs/testing` module for NestJS-specific utilities

## Test File Organization

**Location:**
- Co-located with source files (same directory as implementation)
- Pattern: `{feature}.spec.ts` for unit/integration tests, `{feature}.e2e-spec.ts` for E2E

**Naming:**
- `{feature}.{type}.spec.ts` or `{feature}.e2e-spec.ts`
- Examples:
  - `backend/src/modules/pacientes/pacientes.service.spec.ts`
  - `backend/src/modules/reportes/reportes.controller.spec.ts`
  - `backend/test/app.e2e-spec.ts`

**Structure:**
```
backend/
├── src/
│   ├── modules/
│   │   ├── pacientes/
│   │   │   ├── pacientes.service.ts
│   │   │   ├── pacientes.service.spec.ts
│   │   │   ├── pacientes.controller.ts
│   │   │   ├── pacientes.controller.spec.ts
│   │   │   └── dto/
│   │   └── reportes/
│   │       ├── reportes.controller.spec.ts
│   │       └── services/
│   │           ├── reportes-dashboard.service.spec.ts
│   │           ├── reportes-financieros.service.spec.ts
│   │           └── ...
│   └── prisma-client-exception/
│       ├── prisma-client-exception.filter.ts
│       └── prisma-client-exception.filter.spec.ts
└── test/
    └── jest-e2e.json
```

## Test Structure

**Suite Organization:**
All test files follow NestJS testing conventions with `describe()` blocks and `beforeEach()` setup.

**Pattern:**
```typescript
describe('DiagnosticosService', () => {
  let service: DiagnosticosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiagnosticosService],
    }).compile();

    service = module.get<DiagnosticosService>(DiagnosticosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

**Nested Describe Blocks:**
Tests are organized by functionality using nested `describe()` blocks:

```typescript
describe('ReportesController', () => {
  let controller: ReportesController;

  beforeEach(async () => {
    // Module setup
  });

  describe('Dashboard endpoints', () => {
    describe('GET /reportes/dashboard', () => {
      it('should return dashboard KPIs', async () => {
        // Test implementation
      });
    });
  });

  describe('Operativos endpoints', () => {
    describe('GET /reportes/operativos/turnos', () => {
      it('should return turnos report', async () => {
        // Test implementation
      });
    });
  });
});
```

**Setup & Teardown:**
- `beforeEach()`: Module compilation, service injection, mock reset (`jest.clearAllMocks()`)
- No explicit `afterEach()` observed; Jest handles cleanup automatically

**Assertion Pattern:**
- Tests verify return values match expected shape/content
- Verification of service method calls with `.toHaveBeenCalledWith()`

## Mocking

**Framework:** Jest built-in `jest.fn()`

**Patterns:**

Mock objects created as plain objects with function stubs:
```typescript
const mockDashboardService = {
  getDashboardKPIs: jest.fn(),
};

const mockOperativosService = {
  getReporteTurnos: jest.fn(),
  getReporteAusentismo: jest.fn(),
  getReporteOcupacion: jest.fn(),
  // ... other methods
};
```

Mock values set via `mockResolvedValue()` for async operations:
```typescript
mockDashboardService.getDashboardKPIs.mockResolvedValue(mockKPIs);
```

Mocks injected via NestJS `useValue` provider:
```typescript
const module: TestingModule = await Test.createTestingModule({
  controllers: [ReportesController],
  providers: [
    { provide: ReportesDashboardService, useValue: mockDashboardService },
    { provide: ReportesOperativosService, useValue: mockOperativosService },
    // ... other providers
  ],
}).compile();
```

**Prisma Mocking Example from `reportes-dashboard.service.spec.ts`:**
```typescript
const mockPrismaService = {
  turno: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  movimientoCuenta: {
    aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 } }),
  },
  movimientoCC: {
    aggregate: jest.fn().mockResolvedValue({ _sum: { monto: 0 } }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  alerta: {
    count: jest.fn().mockResolvedValue(0),
  },
  cuentaCorriente: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
  producto: {
    count: jest.fn().mockResolvedValue(0),
  },
  $queryRaw: jest.fn().mockResolvedValue([]),
};
```

**What to Mock:**
- External services (reportService, dashboardService)
- Database layer (Prisma service and its methods)
- Dependencies injected into the class under test

**What NOT to Mock:**
- Internal helpers within the same service
- NestJS framework utilities (Test, TestingModule are real)
- Validation logic (class-validator works naturally)

## Fixtures and Factories

**Test Data:**
Test data is defined inline within test cases using object literals:

```typescript
const mockKPIs = {
  turnosHoy: 10,
  turnosCompletados: 5,
  ingresosHoy: 50000,
};

const filters = {
  profesionalId: 'prof-123',
  fechaDesde: '2024-01-01',
  fechaHasta: '2024-01-31',
};

const mockReport = {
  totalTurnos: 100,
  completados: 80,
};
```

Mock Response objects built with partial implementations:
```typescript
let mockResponse: Partial<Response>;

beforeEach(() => {
  mockResponse = {
    setHeader: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
});
```

**Location:**
- Fixtures defined at the top of test files (within `describe()` blocks)
- No dedicated fixture library detected; factories could be added to improve DRY principle

## Coverage

**Requirements:** Not enforced (no coverage threshold detected in config)

**View Coverage:**
```bash
npm run test:cov
```

**Current Status:**
- Coverage files would be generated in `coverage/` directory
- Individual test files show basic coverage (at least one test per service/controller)

## Test Types

**Unit Tests:**
- Scope: Individual service or controller method
- Approach: Isolate component, mock all dependencies, verify method behavior
- Example: `ReportesController.getDashboard()` tests verify service call and return value
- Location: `backend/src/modules/*/{feature}.service.spec.ts`, `{feature}.controller.spec.ts`

**Integration Tests:**
- Scope: Controller + Service interaction through NestJS module
- Approach: Compile TestingModule with real dependencies (mocked Prisma only), test full request/response cycle
- Example: `ReportesController` tests verify controller method signatures, mocks services, tests response handling
- Location: Same files as unit tests (tests are integrated within describe blocks)

**E2E Tests:**
- Scope: Full application end-to-end
- Framework: Not actively observed; `jest-e2e.json` exists but minimal E2E tests found
- Pattern: Would test from HTTP request → controller → service → Prisma → response
- Location: `backend/test/app.e2e-spec.ts`
- Status: Framework support exists but coverage appears minimal

## Common Patterns

**Async Testing:**
Tests use `async/await` pattern consistently:

```typescript
it('should return dashboard KPIs', async () => {
  const mockKPIs = {
    turnosHoy: 10,
    turnosCompletados: 5,
    ingresosHoy: 50000,
  };
  mockDashboardService.getDashboardKPIs.mockResolvedValue(mockKPIs);

  const result = await controller.getDashboard({ profesionalId: 'prof-123' });

  expect(result).toEqual(mockKPIs);
});
```

No explicit `done()` callbacks or `.then()` chains; all async methods use `await`.

**Error Testing:**
Example pattern from `reportes.controller.spec.ts` (export testing):

```typescript
it('should export JSON report', async () => {
  const mockResult = {
    data: '{"test": true}',
    filename: 'reporte-turnos-2024-01-15.json',
    formato: 'json' as const,
  };
  mockExportService.exportarReporte.mockResolvedValue(mockResult);

  await controller.exportarReporte(
    { tipoReporte: 'turnos', formato: 'json' },
    mockResponse as Response,
  );

  expect(mockResponse.setHeader).toHaveBeenCalledWith(
    'Content-Disposition',
    expect.stringContaining('attachment'),
  );
  expect(mockResponse.setHeader).toHaveBeenCalledWith(
    'Content-Type',
    'application/json; charset=utf-8',
  );
  expect(mockResponse.send).toHaveBeenCalledWith(mockResult.data);
});
```

Error cases should test exception throwing (not observed in provided samples but expected pattern):
```typescript
it('should throw NotFoundException if paciente not found', async () => {
  const pacienteId = 'non-existent-id';
  mockPrisma.paciente.findUnique.mockResolvedValue(null);

  await expect(service.findOne(pacienteId)).rejects.toThrow(
    NotFoundException,
  );
});
```

**Testing Express Response Objects:**
Controllers handling HTTP responses mock Express `Response` object:

```typescript
const mockResponse = {
  setHeader: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
};

// Verify headers and body
expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', '...');
expect(mockResponse.send).toHaveBeenCalledWith(data);
```

## Best Practices Observed

1. **Isolated module compilation** - Each test compiles its own TestingModule, ensuring isolation
2. **Clear mock setup** - Mock objects define all expected methods upfront
3. **Organized test suites** - Nested describe blocks group related tests logically
4. **Async/await consistency** - All async operations use `await`, no callback hell
5. **Reset mocks between tests** - `jest.clearAllMocks()` in beforeEach ensures no test pollution

## Gaps & Recommendations

1. **No E2E test coverage** - `jest-e2e.json` exists but minimal E2E tests found in `backend/test/`
2. **Limited error case testing** - Observed tests focus on happy path; error scenarios underrepresented
3. **No test data factories** - Inline test data could be consolidated into factories for reuse
4. **No coverage thresholds** - No enforced minimum coverage percentage
5. **Console logging in tests** - Some debug logs remain; consider removing or using proper test reporting

---

*Testing analysis: 2026-02-21*
