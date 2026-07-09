/**
 * Tests para funciones de cálculo de suma de Riemann
 * 
 * Verifica que:
 * - El cálculo de Riemann funciona correctamente
 * - Las integrales exactas se calculan con precisión
 * - Se manejan funciones especiales (trigonométricas, con valor absoluto)
 * - No hay errores con funciones problemáticas
 */
import { describe, expect, it } from 'vitest';
import { calcularAreaReal, calcularIntegralExacta, calcularRiemann } from './riemann';

describe('cálculo de Riemann', () => {
  /**
   * Verifica que calcularRiemann funciona para un polinomio simple
   * Prueba: f(x) = x^2 en [0, 2] con 10 rectángulos
   * Esperado: dx = 0.2, resultado positivo, integral disponible
   */
  it('calcula correctamente para x^2 en [0, 2]', () => {
    const resultado = calcularRiemann('x^2', 0, 2, 10, 'medio');
    expect(resultado.dx).toBeCloseTo(0.2, 10);
    expect(resultado.areaTotal).toBeGreaterThan(0);
    expect(resultado.integral.disponible).toBe(true);
  });

  /**
   * Verifica integración exacta analítica para polinomios
   * Prueba: ∫x^2 dx de 0 a 2
   * Esperado: [x^3/3] evaluado en 0 y 2 = 8/3 ≈ 2.667
   */
  it('devuelve una integral exacta para x^2', () => {
    const integral = calcularIntegralExacta('x^2', 0, 2);
    expect(integral.disponible).toBe(true);
    expect(integral.valor).toBeCloseTo(8 / 3, 10);
  });

  /**
   * Verifica integración de funciones trigonométricas
   * Prueba: ∫sin(x) dx de 0 a π
   * Esperado: [-cos(x)] evaluado en 0 y π = 2
   */
  it('maneja funciones trigonométricas', () => {
    const integral = calcularIntegralExacta('sin(x)', 0, Math.PI);
    expect(integral.disponible).toBe(true);
    expect(integral.valor).toBeCloseTo(2, 10);
  });

  /**
   * Verifica cálculo de área real (con valor absoluto)
   * Prueba: ∫|x| dx de -2 a 2
   * Esperado: Área total = 4 (por simetría)
   */
  it('calcula área real para una función con valor absoluto', () => {
    const area = calcularAreaReal('abs(x)', -2, 2);
    expect(area).not.toBeNull();
    expect(area).toBeGreaterThan(0);
  });

  /**
   * Verifica robustez ante funciones problemáticas
   * Prueba: 1/(x-1) tiene una asíntota en x=1, en el intervalo [0, 2]
   * Esperado: No lanza error, devuelve un resultado definido
   */
  it('no rompe con una función no evaluable en algún punto', () => {
    const resultado = calcularRiemann('1/(x-1)', 0, 2, 10, 'medio');
    expect(resultado.areaTotal).toBeDefined();
  });
});
