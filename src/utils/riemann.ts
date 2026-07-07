import { evaluate, parse, simplify } from "mathjs";

export type MetodoRectangulos = "inferior" | "superior" | "medio";
export type VistaRectangulos = "todos" | "inferiores" | "superiores" | "medios";

export type Rectangulo = {
    type: "rect";
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    line?: { width: number };
    fillcolor?: string;
};

export interface PuntoRiemann {
    intervalo: number;
    x: number;
    altura: number;
    ancho: number;
    area: number;
    metodo: MetodoRectangulos;
}

export interface IntegralExacta {
    disponible: boolean;
    expresion: string;
    valor: number | null;
}

export interface ResultadoRiemann {
    dx: number;
    areaTotal: number;
    puntos: PuntoRiemann[];
    metodo: MetodoRectangulos;
    integral: IntegralExacta;
}

function isConstantNode(node: unknown): node is { type: string; value: number } {
    return typeof node === "object" && node !== null && "type" in node && (node as { type?: string }).type === "ConstantNode";
}

function isVariableNode(node: unknown, nombre = "x") {
    return typeof node === "object" && node !== null && "type" in node && (node as { type?: string }).type === "SymbolNode" && "name" in node && (node as { name?: string }).name === nombre;
}

function normalizarExpresion(expresion: string) {
    try {
        const parsed = parse(expresion);
        const simplified = simplify(parsed);
        return simplified.toString();
    } catch {
        return expresion;
    }
}

function evaluarConSoporte(expresion: string, x: number): number | null {
    const texto = expresion.trim();
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

export function evaluarFuncion(funcion: string, x: number): number | null {
    return evaluarConSoporte(funcion, x);
}

export function calcularAreaReal(funcion: string, a: number, b: number): number | null {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
        return null;
    }

    const steps = 800;
    const h = (b - a) / steps;
    let sum = 0;

    for (let i = 0; i <= steps; i++) {
        const xval = a + i * h;
        const valor = evaluarFuncion(funcion, xval);
        const absValor = valor == null ? null : Math.abs(valor);

        if (absValor == null) {
            continue;
        }

        if (i === 0 || i === steps) {
            sum += absValor;
        } else if (i % 2 === 0) {
            sum += 2 * absValor;
        } else {
            sum += 4 * absValor;
        }
    }

    return (h / 3) * sum;
}

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

export function calcularIntegralExacta(funcion: string, a: number, b: number): IntegralExacta {
    try {
        const expr = parse(funcion);
        const antiderivada = integrarNodo(expr);

        if (!antiderivada.ok) {
            return {
                disponible: false,
                expresion: "No disponible",
                valor: null
            };
        }

        const expresionSimplificada = normalizarExpresion(antiderivada.expresion);
        const valor = evaluate(expresionSimplificada, { x: b }) - evaluate(expresionSimplificada, { x: a });
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return {
                disponible: false,
                expresion: "No disponible",
                valor: null
            };
        }

        return {
            disponible: true,
            expresion: expresionSimplificada,
            valor: numero
        };
    } catch {
        return {
            disponible: false,
            expresion: "No disponible",
            valor: null
        };
    }
}

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