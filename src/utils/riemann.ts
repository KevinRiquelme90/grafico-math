/**
 * Módulo de cálculo de sumas de Riemann
 * 
 * Este módulo contiene todas las funciones necesarias para:
 * - Evaluar funciones matemáticas en puntos específicos
 * - Calcular sumas de Riemann usando diferentes métodos
 * - Generar visualizaciones de rectángulos
 * - Integrar numéricamente y encontrar integrales exactas
 */

import { evaluate, parse, simplify } from "mathjs";

/** Tipos de métodos para calcular la suma de Riemann */
export type MetodoRectangulos = "inferior" | "superior" | "medio";

/** Tipos de vistas para mostrar diferentes rectángulos en la gráfica */
export type VistaRectangulos = "todos" | "inferiores" | "superiores" | "medios";

/** Tipos de vistas para mostrar diferentes rectángulos en la gráfica */
export type VistaRectangulos = "todos" | "inferiores" | "superiores" | "medios";

/**
 * Representa un rectángulo en la gráfica
 * Se usa para la visualización de la suma de Riemann en Plotly
 */
export type Rectangulo = {
    type: "rect";
    x0: number;  // Coordenada x inicial
    x1: number;  // Coordenada x final
    y0: number;  // Coordenada y inicial (puede ser 0 o altura)
    y1: number;  // Coordenada y final (puede ser altura o 0)
    line?: { width: number };  // Ancho de la línea del borde
    fillcolor?: string;  // Color de relleno del rectángulo
};

/**
 * Representa un punto de la suma de Riemann
 * Contiene información sobre la altura y área de un rectángulo individual
 */
export interface PuntoRiemann {
    intervalo: number;  // Número del intervalo (1, 2, 3, ...)
    x: number;  // Coordenada x donde se evaluó
    altura: number;  // Altura del rectángulo (valor de f(x))
    ancho: number;  // Ancho del intervalo (dx)
    area: number;  // Área del rectángulo (altura * ancho)
    metodo: MetodoRectangulos;  // Método usado (inferior, superior, medio)
}

/**
 * Resultado de calcular la integral de forma exacta o numérica
 */
export interface IntegralExacta {
    disponible: boolean;  // Si se logró calcular la integral
    expresion: string;  // Descripción o fórmula de la integral
    valor: number | null;  // Valor numérico de la integral
}

/**
 * Resultado completo de calcular una suma de Riemann
 */
export interface ResultadoRiemann {
    dx: number;  // Ancho de cada intervalo
    areaTotal: number;  // Suma total de todas las áreas de los rectángulos
    puntos: PuntoRiemann[];  // Detalles de cada rectángulo
    metodo: MetodoRectangulos;  // Método usado
    integral: IntegralExacta;  // Integral exacta para comparación
}

/**
 * Verifica si un nodo del árbol sintáctico es una constante
 * @param node - Nodo a verificar
 * @returns true si es una constante numérica
 */
function isConstantNode(node: unknown): node is { type: string; value: number } {
    return typeof node === "object" && node !== null && "type" in node && (node as { type?: string }).type === "ConstantNode";
}

/**
 * Verifica si un nodo del árbol sintáctico es una variable (típicamente 'x')
 * @param node - Nodo a verificar
 * @param nombre - Nombre de la variable a buscar (por defecto 'x')
 * @returns true si es la variable especificada
 */
function isVariableNode(node: unknown, nombre = "x") {
    return typeof node === "object" && node !== null && "type" in node && (node as { type?: string }).type === "SymbolNode" && "name" in node && (node as { name?: string }).name === nombre;
}

/**
 * Normaliza una expresión matemática simplificándola
 * @param expresion - Expresión a normalizar
 * @returns Expresión simplificada o la original si hay error
 */
function normalizarExpresion(expresion: string) {
    try {
        const parsed = parse(expresion);
        const simplified = simplify(parsed);
        return simplified.toString();
    } catch {
        return expresion;
    }
}

/**
 * Convierte una expresión ingresada por el usuario a un formato que MathJS pueda procesar
 * 
 * Realiza las siguientes transformaciones:
 * - Reemplaza π por 'pi'
 * - Reemplaza √ por 'sqrt'
 * - Convierte 'sen' a 'sin'
 * - Convierte 'ln' a 'log'
 * - Agrega operadores multiplicación donde falta (ej: 2x -> 2*x)
 * - Interpreta potencias (ej: x2 -> x^2)
 * 
 * @param expresion - Expresión ingresada por el usuario
 * @returns Expresión normalizada lista para evaluar
 */
function normalizarTextoFuncion(expresion: string): string {
    let texto = expresion.trim();
    if (!texto) return "x";

    texto = texto.replace(/\s+/g, " ");
    texto = texto.replace(/π/g, "pi");
    texto = texto.replace(/√/g, "sqrt");
    texto = texto.replace(/\bsen\s*\(/gi, "sin(");
    texto = texto.replace(/\bcos\s*\(/gi, "cos(");
    texto = texto.replace(/\btan\s*\(/gi, "tan(");
    texto = texto.replace(/\bln\s*\(/gi, "log(");
    texto = texto.replace(/\blog\s*\(/gi, "log(");
    texto = texto.replace(/\bexp\s*\(/gi, "exp(");
    texto = texto.replace(/\babs\s*\(/gi, "abs(");
    texto = texto.replace(/([0-9])\s*([xX])/g, "$1*$2");
    texto = texto.replace(/([xX])\s*(\d+)/g, "$1^$2");
    texto = texto.replace(/(\d+)\s*\(/g, "$1*(");
    texto = texto.replace(/\)\s*\(/g, ")*(");

    return texto;
}

/**
 * Evalúa una función en un punto específico
 * 
 * Soporta funciones por partes y maneja errores con gracia.
 * Si la evaluación falla, retorna null en lugar de lanzar error.
 * 
 * @param expresion - Expresión a evaluar (ya normalizada)
 * @param x - Valor de x para la evaluación
 * @returns Valor de f(x) o null si no se puede evaluar
 */
function evaluarConSoporte(expresion: string, x: number): number | null {
    const texto = normalizarTextoFuncion(expresion);
    if (!texto) return null;
    const match = texto.match(/^piecewise\((.*)\)$/i);
    if (match) {
        const contenido = match[1];
        const ramas = contenido.split(/],\s*\[/).map((parte) => parte.trim());
        for (let i = 0; i < ramas.length; i++) {
            let rama = ramas[i];
            if (rama.startsWith("[")) rama = rama.slice(1);
            if (rama.endsWith("]")) rama = rama.slice(0, -1);
            const partes = rama.split(",");
            if (partes.length !== 2) continue;
            const condicion = partes[0].trim();
            const valorExpr = partes[1].trim();
            try {
                const condicionEval = Number(evaluate(condicion, { x }));
                if (Number.isFinite(condicionEval) && condicionEval !== 0) {
                    return Number(evaluate(valorExpr, { x }));
                }
            } catch {
                // intentar siguiente rama
            }
        }
        return null;
    }

    try {
        const valor = Number(evaluate(texto, { x }));
        return Number.isFinite(valor) ? valor : null;
    } catch {
        return null;
    }
}

/**
 * Integra numéricamente usando el método de Simpson
 * 
 * El método de Simpson es más preciso que trapezoidal y aproxima
 * la integral usando parábolas. Usa 2000 pasos para buena precisión.
 * 
 * @param expresion - Función a integrar
 * @param a - Límite inferior
 * @param b - Límite superior
 * @returns Valor de la integral o null si no se puede calcular
 */
function integrarNumericamente(expresion: string, a: number, b: number): number | null {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
        return null;
    }

    const pasos = 2000;
    const h = (b - a) / pasos;
    let sum = 0;

    for (let i = 0; i <= pasos; i++) {
        const xval = a + i * h;
        const valor = evaluarConSoporte(expresion, xval);
        if (valor == null) {
            return null;
        }

        if (i === 0 || i === pasos) {
            sum += valor;
        } else if (i % 2 === 0) {
            sum += 2 * valor;
        } else {
            sum += 4 * valor;
        }
    }

    return (h / 3) * sum;
}

/**
 * Valida que una función tenga sintaxis correcta
 * @param funcion - Expresión a validar
 * @returns Objeto con validez y mensaje de error (si aplica)
 */
export function validarFuncion(funcion: string): { valida: boolean; mensaje?: string } {
    if (!funcion.trim()) {
        return { valida: false, mensaje: 'Escribe una función.' };
    }

    try {
        parse(funcion);
        return { valida: true };
    } catch {
        return { valida: false, mensaje: 'La sintaxis de la función es inválida.' };
    }
}

/**
 * Calcula recursivamente la antiderivada de una expresión
 * 
 * Implementa reglas básicas de integración:
 * - Constantes: ∫c dx = cx
 * - Potencias: ∫x^n dx = x^(n+1)/(n+1)
 * - Suma/resta: ∫(f+g) dx = ∫f dx + ∫g dx
 * - Funciones trigonométricas: ∫sin(x) dx = -cos(x), etc.
 * - Exponencial: ∫e^x dx = e^x
 * 
 * @param node - Nodo del árbol sintáctico a integrar
 * @returns Objeto con éxito y expresión resultante o vacío si falla
 */
function integrarNodo(node: unknown): { ok: boolean; expresion: string } {
    if (typeof node !== "object" || node === null || !("type" in node)) {
        return { ok: false, expresion: "" };
    }

    const tipo = (node as { type?: string }).type;

    if (tipo === "ConstantNode") {
        const valor = Number((node as { value?: number }).value);
        return { ok: true, expresion: `${valor}*x` };
    }

    if (tipo === "SymbolNode") {
        const nombre = (node as { name?: string }).name;
        if (nombre === "x") {
            return { ok: true, expresion: "x^2/2" };
        }

        return { ok: false, expresion: "" };
    }

    if (tipo === "OperatorNode") {
        const op = (node as { op?: string }).op;
        const args = (node as { args?: unknown[] }).args ?? [];

        if (op === "+") {
            const izquierda = integrarNodo(args[0]);
            const derecha = integrarNodo(args[1]);
            if (izquierda.ok && derecha.ok) {
                return { ok: true, expresion: `${izquierda.expresion}+${derecha.expresion}` };
            }
        }

        if (op === "-") {
            const izquierda = integrarNodo(args[0]);
            const derecha = integrarNodo(args[1]);
            if (izquierda.ok && derecha.ok) {
                return { ok: true, expresion: `${izquierda.expresion}-${derecha.expresion}` };
            }
        }

        if (op === "*") {
            const izquierda = args[0];
            const derecha = args[1];
            if (isConstantNode(izquierda)) {
                const c = Number((izquierda as { value?: number }).value);
                const integrando = integrarNodo(derecha);
                if (integrando.ok) {
                    return { ok: true, expresion: `${c}*(${integrando.expresion})` };
                }
            }

            if (isConstantNode(derecha)) {
                const c = Number((derecha as { value?: number }).value);
                const integrando = integrarNodo(izquierda);
                if (integrando.ok) {
                    return { ok: true, expresion: `${c}*(${integrando.expresion})` };
                }
            }
        }

        if (op === "/") {
            const numerador = args[0];
            const denominador = args[1];
            if (isConstantNode(denominador)) {
                const c = Number((denominador as { value?: number }).value);
                const integrando = integrarNodo(numerador);
                if (integrando.ok) {
                    return { ok: true, expresion: `(${integrando.expresion})/${c}` };
                }
            }
        }

        if (op === "^") {
            const base = args[0];
            const exponente = args[1];
            if (isVariableNode(base, "x") && isConstantNode(exponente)) {
                const n = Number((exponente as { value?: number }).value);
                if (Number.isInteger(n) && n >= 0) {
                    if (n === 0) {
                        return { ok: true, expresion: "x" };
                    }
                    return { ok: true, expresion: `x^${n + 1}/${n + 1}` };
                }
            }
        }
    }

    if (tipo === "FunctionNode") {
        const nombre = (node as { fn?: { name?: string } }).fn?.name;
        const argumento = (node as { args?: unknown[] }).args?.[0];

        if (nombre === "sin" && isVariableNode(argumento, "x")) {
            return { ok: true, expresion: "-cos(x)" };
        }

        if (nombre === "cos" && isVariableNode(argumento, "x")) {
            return { ok: true, expresion: "sin(x)" };
        }

        if (nombre === "exp" && isVariableNode(argumento, "x")) {
            return { ok: true, expresion: "exp(x)" };
        }

        if (nombre === "sqrt" && isVariableNode(argumento, "x")) {
            return { ok: true, expresion: "(2/3)*x^(3/2)" };
        }

        if (nombre === "log" && isVariableNode(argumento, "x")) {
            return { ok: true, expresion: "x*log(x)-x" };
        }
    }

    return { ok: false, expresion: "" };
}

/**
 * Evalúa una función en un punto específico
 * Función pública que usa evaluarConSoporte internamente
 * 
 * @param funcion - Expresión de la función
 * @param x - Punto en el que evaluar
 * @returns Valor de f(x) o null si hay error
 */
export function evaluarFuncion(funcion: string, x: number): number | null {
    return evaluarConSoporte(funcion, x);
}

/**
 * Calcula el área real (valor absoluto) bajo la curva
 * 
 * Integra el valor absoluto de la función para obtener el área
 * sin importar si hay valores negativos.
 * 
 * @param funcion - Expresión de la función
 * @param a - Límite inferior del intervalo
 * @param b - Límite superior del intervalo
 * @returns Área real (siempre positivo) o null si no se puede calcular
 */
export function calcularAreaReal(funcion: string, a: number, b: number): number | null {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
        return null;
    }

    return integrarNumericamente(`abs(${normalizarTextoFuncion(funcion)})`, a, b);
}

/**
 * Calcula la suma de Riemann aproximando el área bajo una curva
 * 
 * Divide el intervalo [a, b] en n rectángulos y calcula el área aproximada
 * usando el método especificado (inferior, superior o punto medio).
 * 
 * Métodos:
 * - inferior: altura evaluada en el extremo izquierdo de cada intervalo
 * - superior: altura evaluada en el extremo derecho de cada intervalo
 * - medio: altura evaluada en el punto medio de cada intervalo
 * 
 * @param funcion - Expresión de la función
 * @param a - Límite inferior del intervalo
 * @param b - Límite superior del intervalo
 * @param n - Número de rectángulos
 * @param metodo - Tipo de suma de Riemann (por defecto 'inferior')
 * @returns Objeto con resultados: área, puntos de cada rectángulo, integral exacta, etc.
 */
export function calcularRiemann(
    funcion: string,
    a: number,
    b: number,
    n: number,
    metodo: MetodoRectangulos = "inferior"
): ResultadoRiemann {
    const dx = (b - a) / n;
    let areaTotal = 0;
    const puntos: PuntoRiemann[] = [];

    for (let i = 0; i < n; i++) {
        const xInicio = a + i * dx;
        const xFin = xInicio + dx;
        let xEvaluacion = xInicio;

        if (metodo === "superior") {
            xEvaluacion = xFin;
        } else if (metodo === "medio") {
            xEvaluacion = xInicio + dx / 2;
        }

        const altura = evaluarFuncion(funcion, xEvaluacion);
        const area = (altura ?? 0) * dx;
        areaTotal += area;

        puntos.push({
            intervalo: i + 1,
            x: xInicio,
            altura: altura ?? 0,
            ancho: dx,
            area,
            metodo
        });
    }

    return {
        dx,
        areaTotal,
        puntos,
        metodo,
        integral: calcularIntegralExacta(funcion, a, b)
    };
}

/**
 * Calcula la integral exacta de una función usando el Teorema Fundamental del Cálculo
 * 
 * Intenta usar reglas analíticas de integración. Si eso falla, usa integración numérica.
 * 
 * Proceso:
 * 1. Intenta calcular la antiderivada usando integrarNodo()
 * 2. Si funciona, evalúa en los límites: F(b) - F(a)
 * 3. Si falla, usa el método de Simpson para aproximación numérica
 * 
 * @param funcion - Expresión de la función
 * @param a - Límite inferior
 * @param b - Límite superior
 * @returns Objeto con disponibilidad, expresión de la integral y su valor
 */
export function calcularIntegralExacta(funcion: string, a: number, b: number): IntegralExacta {
    try {
        const expr = parse(funcion);
        const antiderivada = integrarNodo(expr);

        if (antiderivada.ok) {
            const expresionSimplificada = normalizarExpresion(antiderivada.expresion);
            const valor = evaluate(expresionSimplificada, { x: b }) - evaluate(expresionSimplificada, { x: a });
            const numero = Number(valor);

            if (Number.isFinite(numero)) {
                return {
                    disponible: true,
                    expresion: expresionSimplificada,
                    valor: numero
                };
            }
        }

        const valorNumerico = integrarNumericamente(funcion, a, b);
        if (valorNumerico != null) {
            return {
                disponible: true,
                expresion: "Integral numérica (método de Simpson)",
                valor: valorNumerico
            };
        }

        return {
            disponible: false,
            expresion: "No disponible",
            valor: null
        };
    } catch {
        const valorNumerico = integrarNumericamente(funcion, a, b);
        if (valorNumerico != null) {
            return {
                disponible: true,
                expresion: "Integral numérica (método de Simpson)",
                valor: valorNumerico
            };
        }

        return {
            disponible: false,
            expresion: "No disponible",
            valor: null
        };
    }
}

/**
 * Genera los rectángulos para visualizar en la gráfica
 * 
 * Crea un array de objetos Rectangulo que Plotly puede renderizar.
 * Los rectángulos se colorean en rojo si f(x) es negativa.
 * 
 * @param funcion - Expresión de la función
 * @param a - Límite inferior
 * @param b - Límite superior
 * @param n - Número de rectángulos
 * @param metodo - Método de evaluación (inferior, superior, medio)
 * @param color - Color hexadecimal para los rectángulos (por defecto azul)
 * @returns Array de rectángulos listos para Plotly
 */
export function generarRectangulos(
    funcion: string,
    a: number,
    b: number,
    n: number,
    metodo: MetodoRectangulos = "inferior",
    color = "rgba(0, 150, 255, 0.35)"
): Rectangulo[] {
    const dx = (b - a) / n;
    const rectangulos: Rectangulo[] = [];

    for (let i = 0; i < n; i++) {
        const xInicio = a + i * dx;
        const xFin = xInicio + dx;
        let xEvaluacion = xInicio;

        if (metodo === "superior") {
            xEvaluacion = xFin;
        } else if (metodo === "medio") {
            xEvaluacion = xInicio + dx / 2;
        }

        const altura = evaluarFuncion(funcion, xEvaluacion);

        if (altura === null) {
            continue;
        }

        // normalize y0/y1 so rect always has y0 <= y1
        const y0 = Math.min(0, altura);
        const y1 = Math.max(0, altura);

        // If the rectangle is below the axis (negative), use a reddish tint to differentiate
        const negativeFill = "rgba(239, 68, 68, 0.35)"; // red-500
        const fill = altura < 0 ? negativeFill : color;

        rectangulos.push({
            type: "rect",
            x0: xInicio,
            x1: xFin,
            y0,
            y1,
            line: { width: 1 },
            fillcolor: fill
        });
    }

    return rectangulos;
}