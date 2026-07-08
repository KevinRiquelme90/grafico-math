# GeoMath Lab

Aplicación interactiva para visualizar la suma de Riemann, comparar métodos de aproximación y explorar la relación entre una suma de rectángulos y la integral definida.

## Funcionalidades principales

- Ingreso de funciones en formato amigable como x^2, sin(x), sqrt(x), ln(x), pi o exp(x).
- Cálculo de la suma de Riemann con métodos izquierdo, derecho y punto medio.
- Visualización de la curva y los rectángulos sobre el intervalo [a, b].
- Comparación rápida entre los tres métodos en la misma interfaz.
- Modo oscuro y claro, animación de rectángulos, exportación PNG/PDF y modo adivina.

## Cómo usarla

1. Abre la aplicación con:
   ```bash
   npm install
   npm run dev
   ```
2. Escribe una función en el campo principal.
3. Define los límites a, b y el número de rectángulos n.
4. Selecciona el método de evaluación y pulsa Calcular.
5. Observa la gráfica, los resultados numéricos y la comparación entre métodos.

## Nota para la exposición

La aplicación está pensada para presentarse como una herramienta didáctica: permite mostrar visualmente cómo cambia la aproximación al aumentar el número de particiones y cómo los métodos izquierdo, derecho y punto medio se comportan frente a la integral exacta.
