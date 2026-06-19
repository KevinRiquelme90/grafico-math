import { evaluate } from "mathjs";

export function calcularRiemann(
    funcion: string,
    a: number,
    b: number,
    n: number
) {

    const dx = (b - a) / n;

    let areaTotal = 0;

    const puntos = [];

    for (let i = 0; i < n; i++) {

        const x = a + i * dx;

        const altura = evaluate(funcion, { x });

        const area = altura * dx;

        areaTotal += area;

        puntos.push({
            intervalo: i + 1,
            x,
            altura,
            ancho: dx,
            area
        });
    }

    return {
        dx,
        areaTotal,
        puntos
    };
}