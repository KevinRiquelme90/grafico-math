import { describe, expect, it } from 'vitest';
import { calcularAreaReal, calcularIntegralExacta, calcularRiemann } from './riemann';

describe('cálculo de Riemann', () => {
  it('calcula correctamente para x^2 en [0, 2]', () => {
    const resultado = calcularRiemann('x^2', 0, 2, 10, 'medio');
    expect(resultado.dx).toBeCloseTo(0.2, 10);
    expect(resultado.areaTotal).toBeGreaterThan(0);
    expect(resultado.integral.disponible).toBe(true);
  });

  it('devuelve una integral exacta para x^2', () => {
    const integral = calcularIntegralExacta('x^2', 0, 2);
    expect(integral.disponible).toBe(true);
    expect(integral.valor).toBeCloseTo(8 / 3, 10);
  });

  it('maneja funciones trigonométricas', () => {
    const integral = calcularIntegralExacta('sin(x)', 0, Math.PI);
    expect(integral.disponible).toBe(true);
    expect(integral.valor).toBeCloseTo(2, 10);
  });

  it('calcula área real para una función con valor absoluto', () => {
    const area = calcularAreaReal('abs(x)', -2, 2);
    expect(area).not.toBeNull();
    expect(area).toBeGreaterThan(0);
  });

  it('no rompe con una función no evaluable en algún punto', () => {
    const resultado = calcularRiemann('1/(x-1)', 0, 2, 10, 'medio');
    expect(resultado.areaTotal).toBeDefined();
  });
});
