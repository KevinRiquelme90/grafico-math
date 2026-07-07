import { useMemo, useState, useRef, useEffect } from "react";
import Plot from "react-plotly.js";
import { evaluate } from "mathjs";
import { calcularRiemann, generarRectangulos, calcularIntegralExacta, type MetodoRectangulos, type VistaRectangulos } from "./utils/riemann";

function App() {
    const [funcion, setFuncion] = useState("x^2");
    const [editFuncion, setEditFuncion] = useState(funcion);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [integralInputResult, setIntegralInputResult] = useState<{ ok: boolean; expresion?: string; valor?: number | null } | null>(null);
    const [a, setA] = useState(0);
    const [b, setB] = useState(10);
    const [n, setN] = useState(10);
    const [error, setError] = useState("");
    const [metodo, setMetodo] = useState<MetodoRectangulos>("medio");
    const [vista, setVista] = useState<VistaRectangulos>("todos");

    const opcionesVista: Array<{ value: VistaRectangulos; label: string; color: string }> = [
        { value: "todos", label: "Todos", color: "#2563eb" },
        { value: "inferiores", label: "Inferiores", color: "#0ea5e9" },
        { value: "superiores", label: "Superiores", color: "#f97316" },
        { value: "medios", label: "Medios", color: "#10b981" }
    ];
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    const themeVars = theme === "dark" ? {
        pageBg: "linear-gradient(135deg, #07111f 0%, #10253e 100%)",
        panelBg: "rgba(15, 23, 42, 0.9)",
        panelBorder: "rgba(148, 163, 184, 0.2)",
        cardBg: "#0f172a",
        cardBorder: "#334155",
        text: "#e2e8f0",
        muted: "#94a3b8",
        plotText: "#e2e8f0",
        chipBg: "#1e293b"
    } : {
        pageBg: "#ffffff",
        panelBg: "#f8fafc",
        panelBorder: "#e2e8f0",
        cardBg: "#ffffff",
        cardBorder: "#e2e8f0",
        text: "#0f1720",
        muted: "#475569",
        plotText: "#0f1720",
        chipBg: "#f1f5f9"
    };

    function validarIntervalo(nuevoA: number, nuevoB: number) {
        if (nuevoA >= nuevoB) {
            setError("⚠️ El valor de 'a' debe ser menor que 'b'");
            return false;
        }

        setError("");
        return true;
    }

    const resultado = useMemo(() => calcularRiemann(funcion, a, b, n, metodo), [funcion, a, b, n, metodo]);
    // debounce edit -> funcion to avoid heavy recalculations on every keystroke
    useEffect(() => {
        const t = setTimeout(() => {
            // if editFuncion contains a definite integral, parse and compute it instead of setting as plot function
            const parsed = parseDefiniteIntegral(editFuncion);
            if (parsed) {
                // compute integral: try symbolic via calcularIntegralExacta by normalizing variable to x
                try {
                    const integrandX = parsed.expr.replace(new RegExp(`\\b${parsed.var}\\b`, "g"), "x");
                    const exact = calcularIntegralExacta(integrandX, parsed.a, parsed.b);
                    if (exact.disponible) {
                        setIntegralInputResult({ ok: true, expresion: exact.expresion, valor: exact.valor });
                    } else {
                        // numeric fallback
                        const val = numericIntegrate(parsed.expr, parsed.a, parsed.b, parsed.var);
                        setIntegralInputResult({ ok: true, expresion: parsed.raw, valor: val });
                    }
                } catch (e) {
                    const val = numericIntegrate(parsed.expr, parsed.a, parsed.b, parsed.var);
                    setIntegralInputResult({ ok: true, expresion: parsed.raw, valor: val });
                }

                // do not set funcion for plotting when input is a definite integral
            } else {
                setIntegralInputResult(null);
                setFuncion(editFuncion);
            }
        }, 450);

        return () => clearTimeout(t);
    }, [editFuncion, a, b]);
    const [layoutOverride, setLayoutOverride] = useState<any>({});
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

    function handleRelayout(relayoutData: any) {
        // relayoutData can include xaxis.range[0], xaxis.range[1], or xaxis.range
        let x0: number | null = null;
        let x1: number | null = null;
        let y0: number | null = null;
        let y1: number | null = null;

        if (relayoutData['xaxis.range[0]'] !== undefined) {
            x0 = Number(relayoutData['xaxis.range[0]']);
            x1 = Number(relayoutData['xaxis.range[1]']);
        } else if (relayoutData['xaxis.range']) {
            x0 = Number(relayoutData['xaxis.range'][0]);
            x1 = Number(relayoutData['xaxis.range'][1]);
        }

        if (relayoutData['yaxis.range[0]'] !== undefined) {
            y0 = Number(relayoutData['yaxis.range[0]']);
            y1 = Number(relayoutData['yaxis.range[1]']);
        } else if (relayoutData['yaxis.range']) {
            y0 = Number(relayoutData['yaxis.range'][0]);
            y1 = Number(relayoutData['yaxis.range'][1]);
        }

        const newOverride: any = { ...layoutOverride };
        if (x0 !== null && x1 !== null && isFinite(x0) && isFinite(x1)) {
            const range = Math.abs(x1 - x0);
            const step = niceTickStep(range, 8);
            const tick0 = Math.floor(x0 / step) * step;
            newOverride.xaxis = { ...newOverride.xaxis, range: [x0, x1], tick0, dtick: step };
        }

        if (y0 !== null && y1 !== null && isFinite(y0) && isFinite(y1)) {
            const range = Math.abs(y1 - y0);
            const step = niceTickStep(range, 6);
            const tick0 = Math.floor(y0 / step) * step;
            newOverride.yaxis = { ...newOverride.yaxis, range: [y0, y1], tick0, dtick: step };
        }

        setLayoutOverride(newOverride);
    }

    const x: number[] = [];
    const y: (number | null)[] = [];
    const paso = Math.max(0.02, (b - a) / 250);

    for (let i = a; i <= b; i += paso) {
        x.push(i);

        try {
            const valor = evaluate(funcion, { x: i });
            const numero = Number(valor);
            y.push(Number.isFinite(numero) ? numero : null);
        } catch {
            y.push(null);
        }
    }

    function insertAtCursor(text: string) {
        const el = inputRef.current as HTMLInputElement | null;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        const newVal = before + text + after;
        setEditFuncion(newVal);
        // move cursor
        requestAnimationFrame(() => {
            const pos = start + text.length;
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    }

    function parseDefiniteIntegral(input: string): { a: number; b: number; expr: string; var: string; raw: string } | null {
        if (!input) return null;
        // normalize spaces
        const s = input.replace(/\s+/g, ' ');

        // patterns: \int_{a}^{b}(expr)dvar  or  ∫_a^b expr dvar
        const latexRegex = /\\?int\s*_\{?([^}\s]+)\}?\s*\^\{?([^}\s]+)\}?\s*\(?\s*([^)]*?)\s*\)?\s*d([a-zA-Z])/i;
        const simpleRegex = /∫\s*_?\{?([^}\s]+)\}?\s*\^\{?([^}\s]+)\}?\s*([^d]+)d([a-zA-Z])/i;

        let m = latexRegex.exec(s) || simpleRegex.exec(s);
        if (!m) return null;
        const aStr = m[1];
        const bStr = m[2];
        const expr = m[3].trim();
        const variable = m[4];
        const aNum = Number(aStr);
        const bNum = Number(bStr);
        if (!isFinite(aNum) || !isFinite(bNum)) return null;
        return { a: aNum, b: bNum, expr, var: variable, raw: input };
    }

    function numericIntegrate(expr: string, aNum: number, bNum: number, variable: string) {
        const steps = 800; // reasonable performance
        const h = (bNum - aNum) / steps;
        let sum = 0;
        for (let i = 0; i <= steps; i++) {
            const xval = aNum + i * h;
            let fx = 0;
            try {
                const scope: any = {};
                scope[variable] = xval;
                const v = evaluate(expr, scope);
                fx = Number(v) || 0;
            } catch {
                fx = 0;
            }
            if (i === 0 || i === steps) sum += fx;
            else if (i % 2 === 0) sum += 2 * fx;
            else sum += 4 * fx;
        }
        return (h / 3) * sum; // Simpson's rule
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
        inferior: "rgba(0, 150, 255, 0.35)",
        superior: "rgba(255, 99, 71, 0.35)",
        medio: "rgba(40, 167, 69, 0.35)"
    };

    const rectangulos = metodosAMostrar.flatMap((metodoActual) => {
        const color = colorMap[metodoActual];
        return generarRectangulos(funcion, a, b, n, metodoActual, color);
    });

    return (
        <div style={{ padding: "12px 18px", fontFamily: "Inter, Arial, sans-serif", background: themeVars.pageBg, minHeight: "100vh", color: themeVars.text, overflowX: 'hidden' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', height: '100vh' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "2rem", color: themeVars.text }}>GeoMath Lab</h1>
                    <p style={{ margin: "6px 0 0", color: themeVars.muted }}>Explora integrales con rectángulos, filtros visuales y resultados exactos.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: 999, padding: "8px 14px", color: themeVars.text }}>
                        {resultado.integral.disponible ? "Integral simbólica disponible" : "Aproximación numérica"}
                    </div>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        style={{ padding: '8px 10px', borderRadius: 999, border: `1px solid ${themeVars.panelBorder}`, background: themeVars.cardBg, color: themeVars.text, cursor: 'pointer' }}
                    >
                        {theme === 'dark' ? 'Tema: Noche' : 'Tema: Día'}
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", alignItems: "stretch", height: 'calc(100vh - 90px)' }}>
                <div style={{ background: themeVars.panelBg, border: `1px solid ${themeVars.panelBorder}`, borderRadius: "16px", padding: "18px", boxShadow: "0 12px 30px rgba(2, 8, 23, 0.25)", overflowY: 'auto', width: 340 }}>
                    <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.1rem", color: themeVars.text }}>Controles</h2>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                        <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>Función</span>
                        <input
                            ref={inputRef}
                            value={editFuncion}
                            onChange={(e) => setEditFuncion(e.target.value)}
                            placeholder="ej: x^2  o  ∫_2^4 (y^2-3y+5) dy"
                            style={{ padding: "10px 12px", borderRadius: "12px", border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }}
                        />

                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            {['∫', '\\int', '^', '_', 'sqrt()', 'sin()', 'cos()', 'exp()', 'log()', 'pi', 'dx', 'dy', '(', ')', '+', '-', '*', '/'].map((s) => (
                                <button key={s} onClick={() => insertAtCursor(s)} style={{ padding: '6px 8px', borderRadius: 8, background: themeVars.chipBg, border: `1px solid ${themeVars.panelBorder}`, color: themeVars.text, cursor: 'pointer' }}>{s}</button>
                            ))}
                        </div>
                    </label>

                    <div style={{ marginBottom: "12px" }}>
                        <span style={{ display: "block", color: themeVars.muted, fontSize: "0.95rem", marginBottom: "8px" }}>Método</span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {(["inferior", "superior", "medio"] as MetodoRectangulos[]).map((opcion) => (
                                <button
                                    key={opcion}
                                    onClick={() => setMetodo(opcion)}
                                    style={{
                                        border: "none",
                                        borderRadius: "999px",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        background: metodo === opcion ? "#38bdf8" : themeVars.chipBg,
                                        color: metodo === opcion ? "#082f49" : themeVars.text,
                                        fontWeight: 700
                                    }}
                                >
                                    {opcion === "inferior" ? "Inferior" : opcion === "superior" ? "Superior" : "Medio"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                        <span style={{ display: "block", color: themeVars.muted, fontSize: "0.95rem", marginBottom: "8px" }}>Filtros</span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {opcionesVista.map((opcion) => {
                                const isActive = vista === opcion.value;
                                const isTodos = opcion.value === 'todos';
                                return (
                                    <div
                                        key={opcion.value}
                                        onClick={() => setVista(opcion.value)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            padding: '6px 10px',
                                            borderRadius: 12,
                                            background: isActive ? (isTodos ? 'linear-gradient(90deg, rgba(0,150,255,0.22) 0%, rgba(255,99,71,0.22) 33%, rgba(40,167,69,0.22) 66%)' : `${opcion.color}22`) : themeVars.chipBg,
                                            border: `1px solid ${isActive ? opcion.color : themeVars.panelBorder}`
                                        }}
                                    >
                                        {isTodos ? (
                                            // show mini color indicators when 'Todos'
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <div style={{ width: 12, height: 12, background: colorMap.inferior, borderRadius: 2 }} />
                                                <div style={{ width: 12, height: 12, background: colorMap.superior, borderRadius: 2 }} />
                                                <div style={{ width: 12, height: 12, background: colorMap.medio, borderRadius: 2 }} />
                                            </div>
                                        ) : (
                                            <div style={{ width: 16, height: 16, borderRadius: 4, display: 'grid', placeItems: 'center', background: isActive ? opcion.color : 'transparent', color: '#fff', border: `1px solid ${isActive ? opcion.color : themeVars.panelBorder}` }}>
                                                {isActive ? '✓' : ''}
                                            </div>
                                        )}
                                        <div style={{ fontWeight: 700, color: themeVars.text }}>{opcion.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 1fr", marginBottom: "12px" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>a</span>
                            <input
                                type="number"
                                value={a}
                                onChange={(e) => {
                                    const valor = Number(e.target.value);
                                    if (validarIntervalo(valor, b)) {
                                        setA(valor);
                                    }
                                }}
                                style={{ padding: "10px 12px", borderRadius: "12px", border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }}
                            />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ color: themeVars.muted, fontSize: "0.95rem" }}>b</span>
                            <input
                                type="number"
                                value={b}
                                onChange={(e) => {
                                    const valor = Number(e.target.value);
                                    if (validarIntervalo(a, valor)) {
                                        setB(valor);
                                    }
                                }}
                                style={{ padding: "10px 12px", borderRadius: "12px", border: `1px solid ${themeVars.cardBorder}`, background: themeVars.cardBg, color: themeVars.text }}
                            />
                        </label>
                    </div>

                    <label style={{ display: "block", marginBottom: "12px" }}>
                        <div style={{ color: "#cbd5e1", fontSize: "0.95rem", marginBottom: "8px" }}>Rectángulos: {n}</div>
                        <input type="range" min="1" max="200" value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: "100%" }} />
                    </label>

                    {error && <div style={{ color: "#fda4af", marginBottom: "12px", fontWeight: 600 }}>{error}</div>}

                    <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.cardBorder}`, borderRadius: "14px", padding: "10px 12px" }}>
                            <div style={{ color: themeVars.muted, fontSize: "0.9rem" }}>Δx</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: themeVars.text }}>{resultado.dx.toFixed(6)}</div>
                        </div>
                        <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.cardBorder}`, borderRadius: "14px", padding: "10px 12px" }}>
                            <div style={{ color: themeVars.muted, fontSize: "0.9rem" }}>Suma de rectángulos</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: themeVars.text }}>{resultado.areaTotal.toFixed(6)}</div>
                        </div>
                        <div style={{ background: themeVars.cardBg, border: `1px solid ${themeVars.cardBorder}`, borderRadius: "14px", padding: "10px 12px" }}>
                            <div style={{ color: themeVars.muted, fontSize: "0.9rem" }}>Integral exacta</div>
                            {integralInputResult ? (
                                <>
                                    <div style={{ fontSize: "0.95rem", color: themeVars.text, marginTop: "4px" }}>{integralInputResult.expresion}</div>
                                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#38bdf8" }}>{integralInputResult.valor !== null ? integralInputResult.valor?.toFixed(6) : "—"}</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: "0.95rem", color: themeVars.text, marginTop: "4px" }}>{resultado.integral.disponible ? resultado.integral.expresion : "No disponible"}</div>
                                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#38bdf8" }}>{resultado.integral.valor !== null ? resultado.integral.valor.toFixed(6) : "—"}</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ background: themeVars.cardBg, borderRadius: "12px", padding: 0, boxShadow: "0 12px 30px rgba(2, 8, 23, 0.12)", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 12, borderBottom: `1px solid ${themeVars.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: themeVars.text }}>Curva y rectángulos</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>🔍</button>
                            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>➕</button>
                            <button onClick={() => {
                                // reset zoom: set x range to [a,b] and autorange y
                                setLayoutOverride({ xaxis: { range: [a, b] }, yaxis: { autorange: true } });
                                // clear override after small delay to allow further interactions
                                setTimeout(() => setLayoutOverride({}), 300);
                            }} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>🔄 Reset zoom</button>
                        </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, paddingRight: 12 }}>
                        <Plot
                            data={[
                                {
                                    x,
                                    y,
                                    type: "scatter",
                                    mode: "lines",
                                    name: "f(x)",
                                    line: { color: '#0ea5e9' }
                                }
                            ]}
                            layout={{
                                autosize: true,
                                margin: { l: 60, r: 20, t: 8, b: 48 },
                                title: "",
                                paper_bgcolor: themeVars.cardBg,
                                plot_bgcolor: themeVars.cardBg,
                                shapes: rectangulos.map((s) => {
                                    const fill = (s as any).fillcolor as string | undefined;
                                    let lineColor = fill ?? 'rgba(0,0,0,0.9)';
                                    const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/.exec(lineColor || '');
                                    if (m) {
                                        lineColor = `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.95)`;
                                    }

                                    return { ...s, line: { ...(s as any).line, color: lineColor }, layer: 'below' };
                                }),
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
                                font: { color: themeVars.plotText }
                            }}
                            config={{ responsive: true, scrollZoom: true }}
                            onRelayout={handleRelayout}
                            style={{ width: '100%', height: '100%' }}
                        />

                    </div>

                    {/* Detalle de intervalos eliminado para una vista más limpia tipo GeoGebra */}
                </div>
            </div>
        </div>
        </div>
    );
}

export default App;
