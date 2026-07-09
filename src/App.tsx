import { useEffect, useMemo, useRef, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import { evaluate } from "mathjs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { calcularRiemann, generarRectangulos, calcularIntegralExacta, calcularAreaReal, validarFuncion, type MetodoRectangulos, type VistaRectangulos } from "./utils/riemann";

const Plot = createPlotlyComponent(Plotly);

// Estas funciones ayudan a que la expresión escrita por el usuario se vea más clara en la interfaz.
function formatearExpresionParaUI(input: string): string {
    let expr = (input ?? "").trim();
    if (!expr) return "f(x)";
    expr = expr.replace(/\bpi\b/gi, "π");
    expr = expr.replace(/\bexp\(([^)]+)\)/gi, "e^($1)");
    expr = expr.replace(/\blog\(/gi, "ln(");
    expr = expr.replace(/\bsin\(/gi, "sin(");
    expr = expr.replace(/sqrt\(([^)]+)\)/gi, "√($1)");
    expr = expr.replace(/\^2/g, "²");
    expr = expr.replace(/\^3/g, "³");
    return expr;
}

function normalizarExpresion(input: string): string {
    let expr = (input ?? "").trim();
    if (!expr) return "x";

    expr = expr.replace(/\s+/g, " ");
    expr = expr.replace(/π/g, "pi");
    expr = expr.replace(/√/g, "sqrt");
    expr = expr.replace(/\bsen\s*\(/gi, "sin(");
    expr = expr.replace(/\bln\s*\(/gi, "log(");
    expr = expr.replace(/\bexp\b/gi, "exp");
    expr = expr.replace(/\bex\b/gi, "exp(x)");
    expr = expr.replace(/\|([^|]+)\|/g, "abs($1)");
    expr = expr.replace(/([0-9])\s*([xX])/g, "$1*$2");
    expr = expr.replace(/([xX])\s*(\d+)/g, "$1^$2");
    expr = expr.replace(/(\d+)\s*\(/g, "$1*(");
    expr = expr.replace(/\)\s*\(/g, ")*(");
    return expr;
}

function parseDefiniteIntegral(input: string): { a: number; b: number; expr: string; var: string; raw: string } | null {
    if (!input) return null;
    const s = input.replace(/\s+/g, " ");
    const latexRegex = /\\?int\s*_\{?([^}\s]+)\}?\s*\^\{?([^}\s]+)\}?\s*\(?\s*([^)]*?)\s*\)?\s*d([a-zA-Z])/i;
    const simpleRegex = /∫\s*_?\{?([^}\s]+)\}?\s*\^\{?([^}\s]+)\}?\s*([^d]+)d([a-zA-Z])/i;

    const m = latexRegex.exec(s) || simpleRegex.exec(s);
    if (!m) return null;

    const aNum = Number(m[1]);
    const bNum = Number(m[2]);
    if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) return null;

    return { a: aNum, b: bNum, expr: m[3].trim(), var: m[4], raw: input };
}

function numericIntegrate(expr: string, aNum: number, bNum: number, variable: string) {
    const steps = 800;
    const h = (bNum - aNum) / steps;
    let sum = 0;

    for (let i = 0; i <= steps; i++) {
        const xval = aNum + i * h;
        const scope: Record<string, number> = { [variable]: xval };
        try {
            const valor = Number(evaluate(expr, scope));
            if (i === 0 || i === steps) sum += valor;
            else if (i % 2 === 0) sum += 2 * valor;
            else sum += 4 * valor;
        } catch {
            if (i === 0 || i === steps) sum += 0;
            else if (i % 2 === 0) sum += 0;
            else sum += 0;
        }
    }

    return (h / 3) * sum;
}

function App() {
    const [funcion, setFuncion] = useState("x^2");
    const [editFuncion, setEditFuncion] = useState("x^2");
    const [a, setA] = useState(0);
    const [b, setB] = useState(10);
    const [n, setN] = useState(10);
    const [metodo, setMetodo] = useState<MetodoRectangulos>("medio");
    const [vista, setVista] = useState<VistaRectangulos>("todos");
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [integralInputResult, setIntegralInputResult] = useState<{ expresion?: string; valor?: number | null } | null>(null);
    const [layoutOverride, setLayoutOverride] = useState<Record<string, any>>({});
    const [animationProgress, setAnimationProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [history, setHistory] = useState<Array<{ id: number; expresion: string; area: number; exacta: number | null; tiempo: string; n: number; metodo: MetodoRectangulos }>>([]);
    const [comparisonN, setComparisonN] = useState(10);
    const [guessMode, setGuessMode] = useState(false);
    const [guessValue, setGuessValue] = useState("");
    const [guessFeedback, setGuessFeedback] = useState("");
    const [guessStatus, setGuessStatus] = useState<"idle" | "success" | "near" | "far">("idle");
    const [showConfetti, setShowConfetti] = useState(false);
    const [hasCalculated, setHasCalculated] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const plotRef = useRef<any>(null);
    const plotContainerRef = useRef<HTMLDivElement | null>(null);

    const opcionesVista: Array<{ value: VistaRectangulos; label: string; color: string }> = [
        { value: "todos", label: "Todos", color: "#38bdf8" },
        { value: "inferiores", label: "Inferiores", color: "#0ea5e9" },
        { value: "superiores", label: "Superiores", color: "#f97316" },
        { value: "medios", label: "Medios", color: "#10b981" }
    ];

    const themeVars = theme === "dark"
        ? {
            pageBg: "linear-gradient(135deg, #06111d 0%, #14233b 100%)",
            panelBg: "rgba(15, 23, 42, 0.9)",
            panelBorder: "rgba(148, 163, 184, 0.2)",
            cardBg: "#0f172a",
            cardBorder: "#334155",
            text: "#e2e8f0",
            muted: "#94a3b8",
            plotText: "#e2e8f0",
            chipBg: "#1e293b",
            accent: "#38bdf8"
        }
        : {
            pageBg: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
            panelBg: "rgba(255, 255, 255, 0.9)",
            panelBorder: "#dbeafe",
            cardBg: "#ffffff",
            cardBorder: "#e2e8f0",
            text: "#0f172a",
            muted: "#475569",
            plotText: "#0f172a",
            chipBg: "#f8fafc",
            accent: "#2563eb"
        };

    // Cuando el usuario escribe una integral completa, la convertimos en una función normal y en límites de a y b.
    useEffect(() => {
        const t = window.setTimeout(() => {
            const parsed = parseDefiniteIntegral(editFuncion);
            if (parsed) {
                try {
                    const integrandX = parsed.expr.replace(new RegExp(`\\b${parsed.var}\\b`, "g"), "x");
                    const exact = calcularIntegralExacta(integrandX, parsed.a, parsed.b);
                    if (exact.disponible) {
                        setIntegralInputResult({ expresion: exact.expresion, valor: exact.valor });
                    } else {
                        setIntegralInputResult({ expresion: parsed.raw, valor: numericIntegrate(parsed.expr, parsed.a, parsed.b, parsed.var) });
                    }
                } catch {
                    setIntegralInputResult({ expresion: parsed.raw, valor: numericIntegrate(parsed.expr, parsed.a, parsed.b, parsed.var) });
                }
                setFuncion(normalizarExpresion(parsed.expr));
            } else {
                setIntegralInputResult(null);
                setFuncion(normalizarExpresion(editFuncion));
            }
        }, 250);

        return () => window.clearTimeout(t);
    }, [editFuncion]);

    useEffect(() => {
        if (!isAnimating) return;

        const id = window.setInterval(() => {
            setAnimationProgress((prev) => {
                if (prev >= 100) {
                    window.clearInterval(id);
                    setIsAnimating(false);
                    return 100;
                }
                return prev + 8;
            });
        }, 70);

        return () => window.clearInterval(id);
    }, [isAnimating, funcion, a, b, n, metodo]);

    useEffect(() => {
        if (!showConfetti) return;
        const id = window.setTimeout(() => setShowConfetti(false), 1200);
        return () => window.clearTimeout(id);
    }, [showConfetti]);

    // Antes de calcular, revisamos que los datos tengan sentido y que la función se pueda evaluar.
    const validation = useMemo(() => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
            errors.push("El límite inferior a debe ser menor que b.");
        }

        if (!Number.isInteger(n) || n <= 0) {
            errors.push("La cantidad de subintervalos debe ser un entero positivo.");
        }

        const funcionValida = validarFuncion(funcion);
        if (!funcionValida.valida) {
            errors.push(funcionValida.mensaje ?? "La sintaxis de la función es inválida. Revisa los operadores y paréntesis.");
        }

        if (errors.length === 0) {
            const muestras = 220;
            const paso = (b - a) / muestras;
            let hayNegativos = false;
            let hayNoEvaluables = false;
            for (let i = 0; i <= muestras; i++) {
                const x = a + i * paso;
                try {
                    const valor = Number(evaluate(funcion, { x }));
                    if (!Number.isFinite(valor)) {
                        hayNoEvaluables = true;
                    } else if (valor < 0) {
                        hayNegativos = true;
                    }
                } catch {
                    hayNoEvaluables = true;
                }
            }
            if (hayNoEvaluables) {
                warnings.push("La función no se puede evaluar en algunos puntos del intervalo. El resultado puede ser parcial o no representar el comportamiento real.");
            }
            if (hayNegativos) {
                warnings.push("La función toma valores negativos en el intervalo. La integral no representa el área geométrica en este caso.");
            }
            if (!hayNoEvaluables && !hayNegativos) {
                warnings.push("La función parece evaluable en el intervalo y la aproximación se calculará con normalidad.");
            }
        }

        return { errors, warnings };
    }, [a, b, funcion, n]);

    const resultado = useMemo(() => calcularRiemann(funcion, a, b, n, metodo), [a, b, funcion, metodo, n]);
    const resultadoComparacion = useMemo(() => calcularRiemann(funcion, a, b, comparisonN, metodo), [a, b, comparisonN, funcion, metodo]);
    const resultadosMetodos = useMemo(() => ({
        inferior: calcularRiemann(funcion, a, b, n, "inferior"),
        superior: calcularRiemann(funcion, a, b, n, "superior"),
        medio: calcularRiemann(funcion, a, b, n, "medio")
    }), [a, b, funcion, n]);
    const areaReal = useMemo(() => calcularAreaReal(funcion, a, b), [a, b, funcion]);
    const exactValue = integralInputResult?.valor ?? resultado.integral.valor ?? null;
    const errorAbsoluto = exactValue != null ? Math.abs(resultado.areaTotal - exactValue) : null;
    const errorRelativo = errorAbsoluto != null && exactValue != null && exactValue !== 0 ? (errorAbsoluto / Math.abs(exactValue)) * 100 : null;
    const metodoLabel = metodo === "inferior" ? "Izquierdo" : metodo === "superior" ? "Derecho" : "Punto medio";
    const dataConvergencia = useMemo(() => {
        const valores = [5, 10, 20, 40, 80, 160];
        return valores.map((valorN) => {
            const sample = calcularRiemann(funcion, a, b, valorN, metodo);
            return {
                n: valorN,
                error: Math.abs((sample.areaTotal - (exactValue ?? sample.areaTotal)) )
            };
        });
    }, [a, b, exactValue, funcion, metodo]);

    const x: number[] = [];
    const y: Array<number | null> = [];
    const paso = Math.max(0.02, (b - a) / 250);

    for (let i = a; i <= b; i += paso) {
        x.push(i);
        try {
            const valor = Number(evaluate(funcion, { x: i }));
            y.push(Number.isFinite(valor) ? valor : null);
        } catch {
            y.push(null);
        }
    }

    const metodosAMostrar: MetodoRectangulos[] =
        vista === "todos"
            ? ["inferior", "superior", "medio"]
            : vista === "inferiores"
                ? ["inferior"]
                : vista === "superiores"
                    ? ["superior"]
                    : ["medio"];

    const colorMap: Record<MetodoRectangulos, string> = {
        inferior: "rgba(14, 165, 233, 0.35)",
        superior: "rgba(249, 115, 22, 0.35)",
        medio: "rgba(16, 185, 129, 0.35)"
    };

    const rectangulos = metodosAMostrar.flatMap((metodoActual) => {
        const color = colorMap[metodoActual];
        return generarRectangulos(funcion, a, b, n, metodoActual, color);
    });

    const rectangulosVisibles = useMemo(() => {
        const total = rectangulos.length;
        if (total === 0) return [];
        const target = Math.max(1, Math.round((animationProgress / 100) * total));
        return rectangulos.slice(0, target);
    }, [animationProgress, rectangulos]);

    function buildPlotFigure(width?: number, height?: number) {
        const exportWidth = width ?? Math.max(1200, plotContainerRef.current?.clientWidth ?? 1200);
        const exportHeight = height ?? Math.max(780, plotContainerRef.current?.clientHeight ?? 560);

        return {
            data: [
                {
                    x,
                    y,
                    type: "scatter",
                    mode: "lines",
                    name: "f(x)",
                    line: { color: "#38bdf8", width: 3 }
                }
            ],
            layout: {
                width: exportWidth,
                height: exportHeight,
                margin: { l: 56, r: 20, t: 10, b: 50 },
                paper_bgcolor: themeVars.cardBg,
                plot_bgcolor: themeVars.cardBg,
                shapes: rectangulosVisibles.map((shape) => ({ ...shape, line: { ...(shape as any).line, color: (shape as any).fillcolor ?? "rgba(15,23,42,0.95)" }, layer: "below" })),
                xaxis: {
                    title: "Eje X",
                    zeroline: true,
                    color: themeVars.plotText,
                    tickfont: { color: themeVars.plotText, size: 12 },
                    gridcolor: themeVars.panelBorder,
                    zerolinecolor: themeVars.panelBorder,
                    range: layoutOverride.xaxis?.range ?? undefined,
                    dtick: layoutOverride.xaxis?.dtick ?? undefined,
                    tick0: layoutOverride.xaxis?.tick0 ?? undefined
                },
                yaxis: {
                    title: "f(x)",
                    color: themeVars.plotText,
                    tickfont: { color: themeVars.plotText, size: 12 },
                    gridcolor: themeVars.panelBorder,
                    zerolinecolor: themeVars.panelBorder,
                    autorange: layoutOverride.yaxis?.autorange ?? true,
                    dtick: layoutOverride.yaxis?.dtick ?? undefined,
                    tick0: layoutOverride.yaxis?.tick0 ?? undefined
                },
                showlegend: true,
                legend: { bgcolor: "transparent", font: { color: themeVars.plotText }, orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "left", x: 0 }
            },
            config: { responsive: false, scrollZoom: true, displayModeBar: false }
        };
    }

    function evaluateGuess(nextValue: string, options?: { enabled?: boolean; target?: number | null; mode?: boolean }) {
        const enabled = options?.enabled ?? hasCalculated;
        const activeMode = options?.mode ?? guessMode;
        if (!enabled) {
            setGuessFeedback("");
            setGuessStatus("idle");
            setShowConfetti(false);
            return;
        }

        const target = options?.target ?? (activeMode ? (areaReal ?? exactValue ?? resultado.areaTotal) : (exactValue ?? resultado.areaTotal));
        const parsedValue = Number(String(nextValue).replace(",", "."));

        if (!nextValue.trim()) {
            setGuessFeedback("");
            setGuessStatus("idle");
            setShowConfetti(false);
            return;
        }

        if (!Number.isFinite(parsedValue)) {
            setGuessFeedback("Escribe un número válido.");
            setGuessStatus("far");
            setShowConfetti(false);
            return;
        }

        const diff = Math.abs(parsedValue - (target ?? 0));
        const prompt = activeMode ? "el área real" : "la integral exacta";
        const tolerance = Math.max(0.1, Math.abs(target ?? 0) * 0.005 + 0.05);

        if (diff <= tolerance) {
            setGuessStatus("success");
            setGuessFeedback(`¡Acertaste! Tu estimación para ${prompt} fue ${parsedValue.toFixed(4)} y el valor real fue ${Number(target ?? 0).toFixed(4)}.`);
            setShowConfetti(true);
            return;
        }

        if (diff <= tolerance * 2.5) {
            setGuessStatus("near");
            setGuessFeedback(`Estás cerca. Te faltaron ${diff.toFixed(2)} unidades para ${prompt}.`);
            setShowConfetti(false);
            return;
        }

        setGuessStatus("far");
        setGuessFeedback(`Estás lejos. Te faltaron ${diff.toFixed(2)} unidades para ${prompt}.`);
        setShowConfetti(false);
    }

    // Este botón toma la función actual, prepara los datos y empieza la animación del gráfico.
    function handleCalcular() {
        const parsed = parseDefiniteIntegral(editFuncion);
        const expressionFinal = parsed ? normalizarExpresion(parsed.expr) : normalizarExpresion(editFuncion);
        setFuncion(expressionFinal);

        const resumen = calcularRiemann(expressionFinal, a, b, n, metodo);
        const exacto = resumen.integral.valor;
        setHistory((prev) => [{
            id: Date.now(),
            expresion: expressionFinal,
            area: resumen.areaTotal,
            exacta: exacto,
            tiempo: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            n,
            metodo
        }, ...prev].slice(0, 6));
        setGuessFeedback("");
        setGuessStatus("idle");
        setShowConfetti(false);
        setAnimationProgress(0);
        setIsAnimating(true);
        setHasCalculated(true);
    }

    function handleComprobar() {
        if (!guessValue.trim()) return;

        const parsed = parseDefiniteIntegral(editFuncion);
        const expressionFinal = parsed ? normalizarExpresion(parsed.expr) : normalizarExpresion(editFuncion);
        const exacto = integralInputResult?.valor ?? resultado.integral.valor ?? null;
        const targetGuess = guessMode
            ? (calcularAreaReal(expressionFinal, a, b) ?? exacto ?? resultado.areaTotal)
            : (exacto ?? resultado.areaTotal);
        evaluateGuess(guessValue, { enabled: true, target: targetGuess, mode: guessMode });
    }

    function handleLimpiar() {
        setEditFuncion("x^2");
        setFuncion("x^2");
        setA(0);
        setB(10);
        setN(10);
        setMetodo("medio");
        setVista("todos");
        setIntegralInputResult(null);
        setLayoutOverride({});
        setComparisonN(10);
        setGuessValue("");
        setGuessFeedback("");
        setGuessStatus("idle");
        setShowConfetti(false);
        setAnimationProgress(0);
        setIsAnimating(false);
        setHasCalculated(false);
    }

    // Permite guardar una imagen o un PDF del gráfico para compartirlo o conservarlo.
    async function handleExport(format: "png" | "pdf") {
        if (format === "pdf") {
            const pdf = new jsPDF("landscape", "pt", "a4");
            const source = plotContainerRef.current;
            if (!source) {
                window.alert("No se pudo preparar el gráfico para exportar.");
                return;
            }

            try {
                const canvas = await html2canvas(source, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: source.scrollWidth,
                    height: source.scrollHeight
                });

                const imgData = canvas.toDataURL("image/png");
                const pageWidth = pdf.internal.pageSize.getWidth();
                const imgWidth = pageWidth - 40;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const position = 20;

                pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
                pdf.save("Visualizador Interactivo de la Suma de Riemann.pdf");
            } catch {
                window.alert("No se pudo generar el PDF. Intenta de nuevo.");
            }
            return;
        }

        const container = plotContainerRef.current;
        const width = Math.max(1200, Math.round(container?.clientWidth ?? 1200));
        const height = Math.max(780, Math.round(container?.clientHeight ?? 560));
        const figure = buildPlotFigure(width, height);
        const exportDiv = document.createElement("div");
        exportDiv.style.position = "fixed";
        exportDiv.style.left = "-9999px";
        exportDiv.style.top = "-9999px";
        exportDiv.style.width = `${width}px`;
        exportDiv.style.height = `${height}px`;
        document.body.appendChild(exportDiv);

        try {
            await Plotly.newPlot(exportDiv, figure.data as any, figure.layout as any, figure.config as any);
            await new Promise((resolve) => window.setTimeout(resolve, 220));
            const dataUrl = await Plotly.toImage(exportDiv, { format, width, height, scale: 2 });
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `Visualizador Interactivo de la Suma de Riemann.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            window.alert("No se pudo exportar automáticamente. El navegador puede estar bloqueando la descarga. Intenta nuevamente o habilita las descargas en esta página.");
        } finally {
            try {
                Plotly.purge(exportDiv);
            } catch {
                // ignore
            }
            exportDiv.remove();
        }
    }

    function handleGuess(nextValue: string) {
        setGuessValue(nextValue);
        if (!hasCalculated || !guessMode) {
            setGuessFeedback("");
            setGuessStatus("idle");
            setShowConfetti(false);
        }
    }

    function niceTickStep(range: number, targetCount = 8) {
        const raw = range / targetCount;
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        const candidates = [1, 2, 5, 10];
        let best = pow;
        for (const c of candidates) {
            const step = c * pow;
            if (Math.abs(step - raw) / raw < Math.abs(best - raw) / raw) {
                best = step;
            }
        }
        return best;
    }

    function handleRelayout(relayoutData: Record<string, any>) {
        let x0: number | null = null;
        let x1: number | null = null;
        let y0: number | null = null;
        let y1: number | null = null;

        if (relayoutData["xaxis.range[0]"] !== undefined) {
            x0 = Number(relayoutData["xaxis.range[0]"]);
            x1 = Number(relayoutData["xaxis.range[1]"]);
        } else if (relayoutData["xaxis.range"]) {
            x0 = Number(relayoutData["xaxis.range"][0]);
            x1 = Number(relayoutData["xaxis.range"][1]);
        }

        if (relayoutData["yaxis.range[0]"] !== undefined) {
            y0 = Number(relayoutData["yaxis.range[0]"]);
            y1 = Number(relayoutData["yaxis.range[1]"]);
        } else if (relayoutData["yaxis.range"]) {
            y0 = Number(relayoutData["yaxis.range"][0]);
            y1 = Number(relayoutData["yaxis.range"][1]);
        }

        const newOverride: Record<string, any> = { ...layoutOverride };
        if (x0 !== null && x1 !== null && Number.isFinite(x0) && Number.isFinite(x1)) {
            const range = Math.abs(x1 - x0);
            const step = niceTickStep(range, 8);
            const tick0 = Math.floor(x0 / step) * step;
            newOverride.xaxis = { ...newOverride.xaxis, range: [x0, x1], tick0, dtick: step };
        }

        if (y0 !== null && y1 !== null && Number.isFinite(y0) && Number.isFinite(y1)) {
            const range = Math.abs(y1 - y0);
            const step = niceTickStep(range, 6);
            const tick0 = Math.floor(y0 / step) * step;
            newOverride.yaxis = { ...newOverride.yaxis, range: [y0, y1], tick0, dtick: step };
        }

        setLayoutOverride(newOverride);
    }

    const confettiPieces = Array.from({ length: 14 }, (_, index) => ({
        id: index,
        left: `${16 + (index % 7) * 10}%`,
        top: `${20 + Math.floor(index / 7) * 12}%`,
        dx: (index % 2 === 0 ? -1 : 1) * (20 + (index % 4) * 18),
        dy: -70 - (index % 5) * 12,
        color: ["#38bdf8", "#f59e0b", "#10b981", "#f43f5e", "#fef08a"][index % 5]
    }));

    return (
        <div style={{ minHeight: "100vh", background: themeVars.pageBg, color: themeVars.text, fontFamily: "Inter, 'Segoe UI', sans-serif", padding: 18 }}>
            <style>{`@keyframes guessBurst { 0% { transform: translate(0, 0) scale(0.8); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(0.15); opacity: 0; } }`}</style>
            <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 18 }}>
                <header style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 24, padding: 24, boxShadow: "0 20px 50px rgba(15,23,42,0.16)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                        <div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: theme === "dark" ? "rgba(56, 189, 248, 0.15)" : "rgba(37, 99, 235, 0.12)", color: themeVars.accent, fontWeight: 700, marginBottom: 10 }}>
                                <span>∫</span> Visualizador interactivo de la suma de Riemann
                            </div>
                            <h1 style={{ margin: 0, fontSize: "clamp(1.7rem, 2.5vw, 2.5rem)", color: themeVars.text }}>GeoMath Lab</h1>
                            <p style={{ margin: "8px 0 0", maxWidth: 760, color: themeVars.muted, lineHeight: 1.6 }}>
                                Una herramienta elegante para explorar cómo una suma de rectángulos aproxima una integral definida y cómo cambia con el método, los intervalos y la cantidad de particiones.
                            </p>
                            <div style={{ marginTop: 10, fontSize: "1rem", fontWeight: 700, color: themeVars.text }}>
                                Función actual: {formatearExpresionParaUI(funcion)}
                            </div>
                        </div>
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.cardBg, color: themeVars.text, borderRadius: 999, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}
                        >
                            {theme === "dark" ? "☀️ Modo claro" : "🌙 Modo oscuro"}
                        </button>
                    </div>
                </header>

                <section style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) 1fr", gap: 18, alignItems: "start" }}>
                    <aside style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 24, padding: 18, boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <h2 style={{ margin: 0, fontSize: "1.08rem", color: themeVars.text }}>Controles del experimento</h2>
                            <span style={{ color: themeVars.muted, fontSize: "0.9rem" }}>Pedagógico</span>
                        </div>

                        <label style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }} title="Escribe una función sencilla como x^2, sin(x), sqrt(x), ln(x) o una integral definida en formato ∫_a^b f(x) dx.">
                            <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>Función f(x)</span>
                            <input
                                ref={inputRef}
                                value={editFuncion}
                                onChange={(e) => setEditFuncion(e.target.value)}
                                placeholder="Ej: x^2, sin(x), sqrt(x), ∫_0^2 x^2 dx"
                                style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }}
                            />
                        </label>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            {['x^2', 'sin(x)', 'sqrt(x)', 'log(x)', 'pi', 'exp(x)'].map((snippet) => (
                                <button key={snippet} onClick={() => setEditFuncion(snippet)} style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.chipBg, color: themeVars.text, borderRadius: 999, padding: "6px 10px", cursor: "pointer" }}>
                                    {snippet}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <span style={{ display: "block", color: themeVars.muted, fontSize: "0.95rem", marginBottom: 8 }}>Método de evaluación</span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {(["inferior", "superior", "medio"] as MetodoRectangulos[]).map((opcion) => (
                                    <button
                                        key={opcion}
                                        onClick={() => setMetodo(opcion)}
                                        style={{
                                            border: "none",
                                            borderRadius: 999,
                                            padding: "8px 10px",
                                            cursor: "pointer",
                                            background: metodo === opcion ? themeVars.accent : themeVars.chipBg,
                                            color: metodo === opcion ? "#052e16" : themeVars.text,
                                            fontWeight: 700
                                        }}
                                    >
                                        {opcion === "inferior" ? "Izquierdo" : opcion === "superior" ? "Derecho" : "Punto medio"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <span style={{ display: "block", color: themeVars.muted, fontSize: "0.95rem", marginBottom: 8 }}>Vista del gráfico</span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {opcionesVista.map((opcion) => {
                                    const activo = vista === opcion.value;
                                    return (
                                        <button
                                            key={opcion.value}
                                            onClick={() => setVista(opcion.value)}
                                            style={{
                                                border: `1px solid ${activo ? opcion.color : themeVars.panelBorder}`,
                                                background: activo ? `${opcion.color}22` : themeVars.chipBg,
                                                color: themeVars.text,
                                                borderRadius: 999,
                                                padding: "8px 10px",
                                                cursor: "pointer",
                                                fontWeight: 700
                                            }}
                                        >
                                            {opcion.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: 6 }} title="Límite inferior del intervalo de integración.">
                                <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>a</span>
                                <input type="number" value={a} onChange={(e) => setA(Number(e.target.value))} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }} />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", gap: 6 }} title="Límite superior del intervalo de integración.">
                                <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>b</span>
                                <input type="number" value={b} onChange={(e) => setB(Number(e.target.value))} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }} />
                            </label>
                        </div>

                        <label style={{ display: "block", marginBottom: 12 }} title="Número de subintervalos o rectángulos usados para la aproximación.">
                            <div style={{ color: themeVars.muted, fontSize: "0.95rem", marginBottom: 6 }}>Rectángulos: {n}</div>
                            <input type="range" min="1" max="200" value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: "100%" }} />
                        </label>

                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <button onClick={handleCalcular} style={{ flex: 1, padding: "10px 12px", border: "none", borderRadius: 12, background: themeVars.accent, color: theme === "dark" ? "#06202f" : "#f8fafc", cursor: "pointer", fontWeight: 700 }}>
                                Calcular
                            </button>
                            <button onClick={handleLimpiar} style={{ flex: 1, padding: "10px 12px", border: `1px solid ${themeVars.panelBorder}`, borderRadius: 12, background: themeVars.chipBg, color: themeVars.text, cursor: "pointer", fontWeight: 700 }}>
                                Limpiar
                            </button>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                            {validation.errors.map((item) => (
                                <div key={item} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(239, 68, 68, 0.12)", color: "#fda4af", border: "1px solid rgba(239, 68, 68, 0.2)", fontWeight: 600 }}>
                                    {item}
                                </div>
                            ))}
                            {validation.warnings.map((item) => (
                                <div key={item} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.2)", fontWeight: 600 }}>
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: `1px solid ${themeVars.panelBorder}`, marginTop: 14, paddingTop: 14, display: "grid", gap: 10 }}>
                            <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.cardBorder}`, borderRadius: 14, padding: "10px 12px" }}>
                                <div style={{ color: themeVars.muted, fontSize: "0.9rem", marginBottom: 6 }}>Guía rápida</div>
                                <div style={{ color: themeVars.text, fontSize: "0.95rem", display: "grid", gap: 6 }}>
                                    <div>1. Elige una función y ajusta el intervalo [a, b].</div>
                                    <div>2. Modifica n para ver cómo cambia la aproximación.</div>
                                    <div>3. Pulsa Calcular para revelar los resultados y el modo adivina.</div>
                                </div>
                            </div>
                            <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.cardBorder}`, borderRadius: 14, padding: "10px 12px" }}>
                                <div style={{ color: themeVars.muted, fontSize: "0.9rem", marginBottom: 6 }}>Resultados</div>
                                <div style={{ color: themeVars.text, fontSize: "0.95rem" }}>Pulsa Calcular para revelar Δx, la suma de rectángulos, la integral exacta, comparaciones y el resto de herramientas.</div>
                            </div>
                        </div>
                    </aside>

                    <main style={{ background: themeVars.cardBg, borderRadius: 24, border: `1px solid ${themeVars.panelBorder}`, boxShadow: "0 20px 40px rgba(15,23,42,0.12)", overflow: "hidden" }}>
                        <div style={{ padding: 16, borderBottom: `1px solid ${themeVars.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: "0.95rem", color: themeVars.muted }}>Vista interactiva</div>
                                <div style={{ fontWeight: 700, color: themeVars.text }}>Curva principal y rectángulos de Riemann</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: "#38bdf8" }} /> <span style={{ color: themeVars.muted }}>f(x)</span></div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: "rgba(14, 165, 233, 0.35)" }} /> <span style={{ color: themeVars.muted }}>Rectángulos</span></div>
                                <button onClick={() => { setLayoutOverride({ xaxis: { range: [a, b] }, yaxis: { autorange: true } }); setTimeout(() => setLayoutOverride({}), 300); }} style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.chipBg, color: themeVars.text, borderRadius: 999, padding: "8px 10px", cursor: "pointer" }}>
                                    Reset zoom
                                </button>
                                <button onClick={() => { setAnimationProgress(0); setIsAnimating(true); }} style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.accent, color: theme === "dark" ? "#06202f" : "#f8fafc", borderRadius: 999, padding: "8px 10px", cursor: "pointer", fontWeight: 700 }}>
                                    {isAnimating ? "Animando…" : "Animar rectángulos"}
                                </button>
                                <button onClick={() => handleExport("png")} style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.chipBg, color: themeVars.text, borderRadius: 999, padding: "8px 10px", cursor: "pointer" }}>
                                    Exportar PNG
                                </button>
                                <button onClick={() => handleExport("pdf")} style={{ border: `1px solid ${themeVars.panelBorder}`, background: themeVars.chipBg, color: themeVars.text, borderRadius: 999, padding: "8px 10px", cursor: "pointer" }}>
                                    Exportar PDF
                                </button>
                            </div>
                        </div>
                        <div ref={plotContainerRef} id="riemann-plot" style={{ height: 560, padding: 8 }}>
                            <Plot
                                ref={plotRef}
                                data={[
                                    {
                                        x,
                                        y,
                                        type: "scatter",
                                        mode: "lines",
                                        name: "f(x)",
                                        line: { color: "#38bdf8", width: 3 }
                                    }
                                ]}
                                layout={{
                                    autosize: true,
                                    margin: { l: 56, r: 20, t: 10, b: 50 },
                                    paper_bgcolor: themeVars.cardBg,
                                    plot_bgcolor: themeVars.cardBg,
                                    shapes: rectangulosVisibles.map((shape) => ({ ...shape, line: { ...(shape as any).line, color: (shape as any).fillcolor ?? "rgba(15,23,42,0.95)" }, layer: "below" })),
                                    xaxis: {
                                        title: "Eje X",
                                        zeroline: true,
                                        color: themeVars.plotText,
                                        tickfont: { color: themeVars.plotText, size: 12 },
                                        gridcolor: themeVars.panelBorder,
                                        zerolinecolor: themeVars.panelBorder,
                                        range: layoutOverride.xaxis?.range ?? undefined,
                                        dtick: layoutOverride.xaxis?.dtick ?? undefined,
                                        tick0: layoutOverride.xaxis?.tick0 ?? undefined
                                    },
                                    yaxis: {
                                        title: "f(x)",
                                        color: themeVars.plotText,
                                        tickfont: { color: themeVars.plotText, size: 12 },
                                        gridcolor: themeVars.panelBorder,
                                        zerolinecolor: themeVars.panelBorder,
                                        autorange: layoutOverride.yaxis?.autorange ?? true,
                                        dtick: layoutOverride.yaxis?.dtick ?? undefined,
                                        tick0: layoutOverride.yaxis?.tick0 ?? undefined
                                    },
                                    showlegend: true,
                                    legend: { bgcolor: "transparent", font: { color: themeVars.plotText }, orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "left", x: 0 }
                                }}
                                config={{ responsive: true, scrollZoom: true, displayModeBar: true }}
                                onRelayout={handleRelayout}
                                style={{ width: "100%", height: "100%" }}
                            />
                        </div>
                        <div style={{ padding: 16, borderTop: `1px solid ${themeVars.panelBorder}`, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                            <div style={{ position: "relative", overflow: "hidden", background: guessStatus === "success" ? "rgba(16, 185, 129, 0.14)" : guessStatus === "near" ? "rgba(249, 115, 22, 0.14)" : guessStatus === "far" ? "rgba(239, 68, 68, 0.14)" : themeVars.panelBg, border: `1px solid ${guessStatus === "success" ? "rgba(16, 185, 129, 0.45)" : guessStatus === "near" ? "rgba(249, 115, 22, 0.45)" : guessStatus === "far" ? "rgba(239, 68, 68, 0.45)" : themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                {showConfetti && guessStatus === "success" ? (
                                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 18 }}>
                                        {confettiPieces.map((piece) => (
                                            <span
                                                key={piece.id}
                                                style={{
                                                    position: "absolute",
                                                    left: piece.left,
                                                    top: piece.top,
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 999,
                                                    background: piece.color,
                                                    animation: "guessBurst 0.9s ease-out forwards",
                                                    opacity: 0.95,
                                                    ["--dx" as any]: `${piece.dx}px`,
                                                    ["--dy" as any]: `${piece.dy}px`
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                                <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Modo adivina</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                    <button onClick={() => { setGuessMode(false); setGuessFeedback(""); setGuessStatus("idle"); setShowConfetti(false); }} style={{ border: "none", borderRadius: 999, padding: "7px 10px", cursor: "pointer", background: !guessMode ? themeVars.accent : themeVars.chipBg, color: !guessMode ? (theme === "dark" ? "#06202f" : "#f8fafc") : themeVars.text, fontWeight: 700 }}>Integral exacta</button>
                                    <button onClick={() => { setGuessMode(true); setGuessFeedback(""); setGuessStatus("idle"); setShowConfetti(false); }} style={{ border: "none", borderRadius: 999, padding: "7px 10px", cursor: "pointer", background: guessMode ? themeVars.accent : themeVars.chipBg, color: guessMode ? (theme === "dark" ? "#06202f" : "#f8fafc") : themeVars.text, fontWeight: 700 }}>Área real</button>
                                </div>
                                <input value={guessValue} onChange={(e) => handleGuess(e.target.value)} placeholder="Tu estimación" style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${guessStatus === "success" ? "rgba(16, 185, 129, 0.45)" : guessStatus === "near" ? "rgba(249, 115, 22, 0.45)" : guessStatus === "far" ? "rgba(239, 68, 68, 0.45)" : themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text, marginBottom: 8 }} />
                                <button
                                    onClick={handleComprobar}
                                    disabled={!guessValue.trim()}
                                    style={{ width: "100%", padding: "8px 10px", border: "none", borderRadius: 10, background: guessValue.trim() ? themeVars.accent : themeVars.chipBg, color: guessValue.trim() ? (theme === "dark" ? "#06202f" : "#f8fafc") : themeVars.muted, cursor: guessValue.trim() ? "pointer" : "not-allowed", fontWeight: 700, marginBottom: 8 }}
                                >
                                    Comprobar
                                </button>
                                <div style={{ color: themeVars.muted, fontSize: "0.86rem", marginBottom: 8 }}>Escribe un número y pulsa Comprobar para ver si acertaste o cuántas unidades te faltaron.</div>
                                {guessFeedback ? <div style={{ marginTop: 8, color: guessStatus === "success" ? "#10b981" : guessStatus === "near" ? "#facc15" : guessStatus === "far" ? "#ef4444" : themeVars.text, fontSize: "0.95rem" }}>{guessFeedback}</div> : null}
                            </div>
                            {!hasCalculated ? (
                                <div style={{ gridColumn: "1 / -1", background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 16, color: themeVars.muted }}>
                                    Pulsa Calcular para revelar los resultados: Δx, suma de rectángulos, integral exacta, comparación entre métodos, área real, historial y convergencia.
                                </div>
                            ) : (
                                <>
                                    <div style={{ gridColumn: "1 / -1", background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Resumen conceptual</div>
                                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                                            <div style={{ borderRadius: 12, border: `1px solid ${themeVars.panelBorder}`, background: themeVars.cardBg, padding: "10px 12px" }}>
                                                <div style={{ color: themeVars.muted, fontSize: "0.9rem", marginBottom: 4 }}>Fórmula de Δx</div>
                                                <div style={{ color: themeVars.text, fontWeight: 700 }}>Δx = (b - a) / n = {resultado.dx.toFixed(4)}</div>
                                            </div>
                                            <div style={{ borderRadius: 12, border: `1px solid ${themeVars.panelBorder}`, background: themeVars.cardBg, padding: "10px 12px" }}>
                                                <div style={{ color: themeVars.muted, fontSize: "0.9rem", marginBottom: 4 }}>Método activo</div>
                                                <div style={{ color: themeVars.text, fontWeight: 700 }}>{metodoLabel}</div>
                                            </div>
                                            <div style={{ borderRadius: 12, border: `1px solid ${themeVars.panelBorder}`, background: themeVars.cardBg, padding: "10px 12px" }}>
                                                <div style={{ color: themeVars.muted, fontSize: "0.9rem", marginBottom: 4 }}>Idea clave</div>
                                                <div style={{ color: themeVars.text, fontWeight: 700 }}>Mientras más rectángulos haya, la aproximación se acerca más a la integral.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Δx</div>
                                        <div style={{ fontSize: "1.08rem", fontWeight: 800, color: themeVars.text }}>{resultado.dx.toFixed(6)}</div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Suma de rectángulos</div>
                                        <div style={{ fontSize: "1.08rem", fontWeight: 800, color: themeVars.text }}>{resultado.areaTotal.toFixed(6)}</div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Integral exacta</div>
                                        {integralInputResult ? (
                                            <>
                                                <div style={{ fontSize: "0.92rem", color: themeVars.text, marginTop: 4 }}>{integralInputResult.expresion}</div>
                                                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: themeVars.accent }}>{integralInputResult.valor != null ? integralInputResult.valor.toFixed(6) : "—"}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: "0.92rem", color: themeVars.text, marginTop: 4 }}>{resultado.integral.disponible ? resultado.integral.expresion : "No disponible"}</div>
                                                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: themeVars.accent }}>{resultado.integral.valor !== null ? resultado.integral.valor.toFixed(6) : "—"}</div>
                                            </>
                                        )}
                                        {errorAbsoluto != null ? (
                                            <div style={{ marginTop: 6, fontSize: "0.9rem", color: themeVars.muted }}>
                                                Error absoluto: <span style={{ color: themeVars.text, fontWeight: 700 }}>{errorAbsoluto.toFixed(6)}</span>
                                                {errorRelativo != null ? <><br />Error relativo: <span style={{ color: themeVars.text, fontWeight: 700 }}>{errorRelativo.toFixed(4)}%</span></> : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ gridColumn: "1 / -1", background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Comparación rápida de métodos</div>
                                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                            {[
                                                { key: "inferior", label: "Izquierdo", color: "#38bdf8", value: resultadosMetodos.inferior.areaTotal },
                                                { key: "superior", label: "Derecho", color: "#f97316", value: resultadosMetodos.superior.areaTotal },
                                                { key: "medio", label: "Punto medio", color: "#10b981", value: resultadosMetodos.medio.areaTotal }
                                            ].map((item) => (
                                                <div key={item.key} style={{ border: `1px solid ${themeVars.panelBorder}`, borderRadius: 12, padding: "10px 12px", background: themeVars.cardBg }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ width: 10, height: 10, borderRadius: 999, background: item.color }} />
                                                        <span style={{ color: themeVars.text, fontWeight: 700 }}>{item.label}</span>
                                                    </div>
                                                    <div style={{ color: themeVars.muted, fontSize: "0.9rem" }}>≈ {item.value.toFixed(4)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Comparador en tiempo real</div>
                                        <input type="range" min="2" max="200" value={comparisonN} onChange={(e) => setComparisonN(Number(e.target.value))} style={{ width: "100%" }} />
                                        <div style={{ marginTop: 8, color: themeVars.text, fontWeight: 700 }}>n = {comparisonN} · Área ≈ {resultadoComparacion.areaTotal.toFixed(4)}</div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Área real con |f(x)|</div>
                                        <div style={{ fontWeight: 800, color: themeVars.text }}>{areaReal != null ? areaReal.toFixed(4) : "—"}</div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Historial de cálculos</div>
                                        <div style={{ display: "grid", gap: 8 }}>
                                            {history.length === 0 ? <div style={{ color: themeVars.muted }}>Pulsa calcular para guardar una simulación.</div> : history.map((entry) => (
                                                <div key={entry.id} style={{ border: `1px solid ${themeVars.panelBorder}`, borderRadius: 12, padding: "8px 10px", background: themeVars.cardBg }}>
                                                    <div style={{ fontSize: "0.9rem", color: themeVars.muted }}>{entry.tiempo} · n={entry.n} · {entry.metodo}</div>
                                                    <div style={{ fontWeight: 700, color: themeVars.text }}>{entry.expresion}</div>
                                                    <div style={{ fontSize: "0.9rem", color: themeVars.accent }}>Área ≈ {entry.area.toFixed(3)} · exacta {entry.exacta != null ? entry.exacta.toFixed(3) : "—"}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 18, padding: 14 }}>
                                        <div style={{ fontSize: "0.95rem", color: themeVars.muted, marginBottom: 8 }}>Convergencia (error vs. n)</div>
                                        <svg viewBox="0 0 320 140" width="100%" height="140" style={{ display: "block" }}>
                                            <line x1="12" y1="118" x2="308" y2="118" stroke={themeVars.panelBorder} />
                                            <line x1="12" y1="12" x2="12" y2="118" stroke={themeVars.panelBorder} />
                                            {dataConvergencia.map((point, index) => {
                                                const xPos = 20 + (index / (dataConvergencia.length - 1)) * 288;
                                                const yPos = 118 - (Math.min(1, point.error / Math.max(1, Math.max(...dataConvergencia.map((item) => item.error)))) * 90);
                                                return <circle key={point.n} cx={xPos} cy={yPos} r="3" fill={themeVars.accent} />;
                                            })}
                                            <polyline
                                                fill="none"
                                                stroke={themeVars.accent}
                                                strokeWidth="2"
                                                points={dataConvergencia.map((point, index) => {
                                                    const xPos = 20 + (index / (dataConvergencia.length - 1)) * 288;
                                                    const yPos = 118 - (Math.min(1, point.error / Math.max(1, Math.max(...dataConvergencia.map((item) => item.error)))) * 90);
                                                    return `${xPos},${yPos}`;
                                                }).join(" ")}
                                            />
                                        </svg>
                                        <div style={{ display: "flex", justifyContent: "space-between", color: themeVars.muted, fontSize: "0.8rem", marginTop: 6 }}>
                                            {dataConvergencia.map((point) => <span key={point.n}>{point.n}</span>)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </main>
                </section>
            </div>
        </div>
    );
}

export default App;
