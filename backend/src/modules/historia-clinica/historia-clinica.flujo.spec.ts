import { resolverNuevoFlujo } from './historia-clinica.service';

describe('resolverNuevoFlujo', () => {
  // Test 1: CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA
  it('CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA', () => {
    expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'PENDIENTE', false)).toBe('CIRUGIA');
  });

  // Test 2: CONSULTA_CIRUGIA + CIRUGIA → null (sin cambio)
  it('CONSULTA_CIRUGIA + CIRUGIA → null (sin cambio)', () => {
    expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'CIRUGIA', false)).toBeNull();
  });

  // Test 3: TRATAMIENTO + PENDIENTE → TRATAMIENTO
  it('TRATAMIENTO + PENDIENTE → TRATAMIENTO', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'PENDIENTE', false)).toBe('TRATAMIENTO');
  });

  // Test 4: TRATAMIENTO + CIRUGIA → null (dual-state preservado, HC-04)
  it('TRATAMIENTO + CIRUGIA → null (dual-state preservado)', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'CIRUGIA', false)).toBeNull();
  });

  // Test 5: TRATAMIENTO + TRATAMIENTO → null
  it('TRATAMIENTO + TRATAMIENTO → null', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'TRATAMIENTO', false)).toBeNull();
  });

  // Test 6: CONTROL + PENDIENTE → null
  it('CONTROL + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('CONTROL', 'PENDIENTE', false)).toBeNull();
  });

  // Test 7: SEGUIMIENTO + PENDIENTE → null
  it('SEGUIMIENTO + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('SEGUIMIENTO', 'PENDIENTE', false)).toBeNull();
  });

  // Test 8: PREOPERATORIO + PENDIENTE → null
  it('PREOPERATORIO + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('PREOPERATORIO', 'PENDIENTE', false)).toBeNull();
  });

  // Test 9: esCirugia guard — CONSULTA_CIRUGIA + PENDIENTE + esCirugia=true → null
  it('esCirugia=true omite el cambio de flujo (criterio 5)', () => {
    expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'PENDIENTE', true)).toBeNull();
  });

  // Test 10: tipoEntrada undefined → null (entradas legacy / sin clasificar)
  it('tipoEntrada undefined → null (entradas legacy)', () => {
    expect(resolverNuevoFlujo(undefined, 'PENDIENTE', false)).toBeNull();
  });
});
