/**
 * AfipRealService unit tests — scaffold (Wave 0)
 * Tests are xit (skipped) until Plan 02 implements AfipRealService.
 * Plans 02 converts xit → it and fills the implementations.
 *
 * Coverage:
 *   CAE-02: FECAESolicitar SOAP called correctly, advisory lock acquired, CAE+nroComprobante persisted
 *   CAE-03: Error 10242 → AfipBusinessError → spanishMessage in human-readable Spanish
 */

describe('AfipRealService', () => {
  // CAE-02: Happy path
  xit('calls FECAESolicitar with correct SOAP envelope and returns CAE 14 digits', async () => {
    // TODO Plan 02: mock axios.post returning valid FECAESolicitar XML response
    // expect result.cae to have length 14
    // expect result.resultado to be 'A'
  });

  // CAE-02: Advisory lock + sequence
  xit('acquires pg_advisory_xact_lock before calling FECAESolicitar', async () => {
    // TODO Plan 02: mock prisma.$transaction and verify $queryRawUnsafe called with hashtext
  });

  // CAE-02: Persistence
  xit('persists CAE, caeFchVto, nroComprobante, ptoVta, estado=EMITIDA on Factura after successful emission', async () => {
    // TODO Plan 02: mock prisma.factura.update; verify called with correct fields
  });

  // CAE-02: getUltimoAutorizado
  xit('calls FECompUltimoAutorizado and uses lastNro+1 as cbteDesde', async () => {
    // TODO Plan 02: mock axios.post returning FECompUltimoAutorizado response with CbteNro
    // expect FECAESolicitar called with cbteDesde = lastNro + 1
  });

  // CAE-03: Business error translation
  xit('throws AfipBusinessError with Spanish message when resultado=R', async () => {
    // TODO Plan 02: mock FECAESolicitar response returning resultado='R', Obs with code 10242
    // expect AfipBusinessError thrown with spanishMessage containing human-readable text
  });

  // CAE-03: Error 10242 specific translation
  xit('AfipBusinessError.spanishMessage for code 10242 mentions condicion IVA', async () => {
    // TODO Plan 02: trigger error 10242; verify spanishMessage contains 'IVA' or 'condición'
  });
});
