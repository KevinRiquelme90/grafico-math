# 📊 Gráfico Math - Visualizador de Sumas de Riemann

Una aplicación web interactiva y educativa que te permite explorar visualmente las **sumas de Riemann**, comparar diferentes métodos de aproximación numérica y comprender la relación entre rectángulos y la integral definida.

## 📋 Descripción del Proyecto

Gráfico Math es una herramienta didáctica diseñada para estudiantes de cálculo. Permite visualizar cómo diferentes métodos de aproximación (rectángulos izquierdos, derechos y punto medio) convergen hacia el valor real de una integral. Perfecta para presentaciones educativas y aprendizaje interactivo.

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalados:

### 1. **Node.js** (versión 16 o superior)
   - Descárgalo desde: https://nodejs.org/
   - Verifica la instalación:
     ```bash
     node --version
     ```

### 2. **pnpm** (gestor de paquetes)
   - Instálalo globalmente:
     ```bash
     npm install -g pnpm
     ```
   - Verifica la instalación:
     ```bash
     pnpm --version
     ```

---

## 🚀 Instalación

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/KevinRiquelme90/grafico-math.git
cd grafico-math
```

### Paso 2: Instalar dependencias
```bash
pnpm install
```

> **Nota importante**: Al clonar desde GitHub, **NO incluye la carpeta `node_modules/`** (para que el archivo sea más ligero). El comando `pnpm install` descargará e instalará automáticamente todas las dependencias necesarias basándose en el archivo `pnpm-lock.yaml`.

### Paso 3: Verificar la instalación
```bash
pnpm run lint
```

Si no ves errores, ¡todo está listo!

---

## 🎮 Cómo Usar la Aplicación

### Iniciar en modo desarrollo
```bash
pnpm run dev
```

La aplicación se abrirá automáticamente en `http://localhost:5173`

### Pasos para usar:

1. **Escribe una función** en el campo de entrada (ejemplos: `x^2`, `sin(x)`, `sqrt(x)`, `ln(x)`, `exp(x)`)
2. **Define el intervalo**: Ingresa los límites inferior (a) y superior (b)
3. **Cantidad de rectángulos**: Especifica el número de particiones (n)
4. **Selecciona el método**: Elige entre:
   - ▶️ **Izquierda** - Rectángulos con altura en el extremo izquierdo
   - ◀️ **Derecha** - Rectángulos con altura en el extremo derecho
   - 🎯 **Punto Medio** - Rectángulos con altura en el punto medio
5. **Calcula**: Presiona el botón "Calcular"
6. **Analiza**: Observa la gráfica, los resultados numéricos y las comparaciones

---

## ⚙️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Inicia el servidor de desarrollo |
| `pnpm run build` | Compila el proyecto para producción |
| `pnpm run preview` | Visualiza el build de producción localmente |
| `pnpm run lint` | Ejecuta el validador de código (ESLint) |
| `pnpm run test` | Ejecuta los tests unitarios |

---

## ✨ Funcionalidades Principales

- ✅ **Ingreso flexible de funciones** - Soporta operadores matemáticos estándar (^, sin, cos, tan, sqrt, ln, exp, pi, etc.)
- ✅ **Tres métodos de Riemann** - Izquierda, derecha y punto medio en simultáneo
- ✅ **Visualización interactiva** - Gráfica con curva y rectángulos superpuestos
- ✅ **Comparación en tiempo real** - Compara los métodos lado a lado
- ✅ **Análisis de convergencia** - Visualiza cómo cambia el error al aumentar n
- ✅ **Cálculo del área exacta** - Determina el valor real de la integral
- ✅ **Tema oscuro/claro** - Alterna entre modos de visualización
- ✅ **Exportación** - Descarga los gráficos en PNG o PDF
- ✅ **Historial de cálculos** - Guarda los cálculos anteriores
- ✅ **Modo adivinanza** - Modo interactivo para aprender

---

## 📁 Estructura del Proyecto

```
grafico-math/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/        # Componentes React
│   │   ├── FunctionForm.tsx      # Formulario de entrada
│   │   ├── Graph.tsx             # Visualización de gráficas
│   │   └── ResultsTable.tsx      # Tabla de resultados
│   ├── utils/
│   │   ├── riemann.ts            # Lógica de suma de Riemann
│   │   └── riemann.test.ts       # Tests unitarios
│   ├── types/
│   │   ├── plotly.d.ts           # Tipos de Plotly
│   │   └── plotly-dist-min.d.ts
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Punto de entrada
│   ├── App.css            # Estilos globales
│   └── index.css          # Estilos base
├── package.json           # Dependencias del proyecto
├── pnpm-lock.yaml         # Lock file (versions exactas)
├── vite.config.ts         # Configuración de Vite
├── tsconfig.json          # Configuración de TypeScript
├── eslint.config.js       # Configuración de ESLint
├── .gitignore             # Archivos a ignorar en Git
└── README.md              # Este archivo

⚠️ **NO INCLUIDOS en GitHub** (se generan localmente):
   - node_modules/        # Dependencias instaladas (~500MB)
   - dist/                # Build para producción
   - .env.local           # Variables de entorno locales
```

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|----------|
| **React** | 19.2.6 | Framework UI |
| **TypeScript** | Latest | Tipado seguro |
| **Vite** | Latest | Build tool y dev server |
| **MathJS** | 15.2.0 | Evaluación de expresiones matemáticas |
| **Plotly.js** | 3.7.0 | Visualización de gráficas |
| **html2canvas** | 1.4.1 | Conversión a imagen |
| **jsPDF** | 4.2.1 | Generación de PDFs |

---

## 📚 Guía de Uso Detallada

### Ingreso de Funciones

Puedes escribir funciones usando:

**Operadores básicos:**
- `x^2` → x elevado a la potencia 2
- `x*2` → x multiplicado por 2
- `x/2` → x dividido por 2
- `x+2` → x más 2

**Funciones trigonométricas:**
- `sin(x)` → seno
- `cos(x)` → coseno
- `tan(x)` → tangente

**Funciones logarítmicas y exponenciales:**
- `ln(x)` → logaritmo natural
- `log(x)` → logaritmo en base 10
- `exp(x)` → exponencial (e^x)

**Otras funciones:**
- `sqrt(x)` → raíz cuadrada
- `abs(x)` → valor absoluto
- `pi` → constante π

**Ejemplos completos:**
- `x^2 + 2*x + 1`
- `sin(x) * cos(x)`
- `sqrt(x) + ln(x)`
- `exp(-x^2)`

---

## 🧪 Testing

Para ejecutar los tests:
```bash
pnpm run test
```

Los tests están en `src/utils/riemann.test.ts` y verifican que los cálculos de Riemann sean correctos.

---

## 🔧 Troubleshooting

### Error: "pnpm: command not found"
**Solución**: Instala pnpm globalmente
```bash
npm install -g pnpm
```

### Error: "Cannot find module"
**Solución**: Reinstala las dependencias
```bash
pnpm install
```

### El servidor no se inicia
**Solución**: Verifica que no hay otro proceso usando el puerto 5173
```bash
# Windows
netstat -ano | findstr :5173

# Mac/Linux
lsof -i :5173
```

### Errores de TypeScript
**Solución**: Compila nuevamente
```bash
pnpm run build
```

### La gráfica no se muestra
**Solución**: Limpia la caché y recarga
```bash
# Limpia cache de pnpm
pnpm store prune

# Reinstala
pnpm install

# Reinicia el dev server
pnpm run dev
```

---

## 📦 Compilar para Producción

Para generar una versión optimizada lista para desplegar:

```bash
pnpm run build
```

Esto creará la carpeta `dist/` con los archivos compilados. Puedes visualizar la compilación con:

```bash
pnpm run preview
```

---

## 💡 Notas Importantes

- **Lock file**: El archivo `pnpm-lock.yaml` garantiza que todos descarguen exactamente las mismas versiones de las dependencias
- **node_modules NO está en GitHub**: Para mantener el repositorio ligero, la carpeta `node_modules/` está en `.gitignore`
- **Funcionalidad offline**: Una vez instalado, puedes trabajar sin conexión a internet
- **Cambios en dependencies**: Si alguien agrega una nueva dependencia, ejecuta `pnpm install` nuevamente

---

## 👨‍💼 Autor

Proyecto desarrollado por **Kevin Riquelme** 

---

## 📄 Licencia

Este proyecto es de código abierto y disponible bajo la licencia MIT.

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que cumples con los **Requisitos Previos**
2. Revisa la sección **Troubleshooting**
3. Asegúrate de tener la última versión ejecutando `git pull`
4. Reinstala dependencias con `pnpm install`

---

**¡Listo para explorar las matemáticas de forma interactiva! 🚀**
