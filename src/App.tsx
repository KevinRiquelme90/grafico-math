import { useState } from "react";
import { calcularRiemann } from "./utils/riemann";
import Plot from "react-plotly.js";

function App() {

  const [funcion, setFuncion] = useState("x^2");
  const [a, setA] = useState(0);
  const [b, setB] = useState(10);

  const [n, setN] = useState(10);

  const resultado = calcularRiemann(
      funcion,
      a,
      b,
      n
  );

  const x = [];
  const y = [];

  for(let i=a; i<=b; i+=0.1){

    x.push(i);

    y.push(
        Math.pow(i,2)
    );
  }

  return (
      <div style={{padding:"20px"}}>

        <h1>
          Integración Numérica
        </h1>

        <input
            value={funcion}
            onChange={(e)=>setFuncion(e.target.value)}
        />

        <br /><br />

        <label>
          a:
        </label>

        <input
            type="number"
            value={a}
            onChange={(e)=>setA(Number(e.target.value))}
        />

        <br /><br />

        <label>
          b:
        </label>

        <input
            type="number"
            value={b}
            onChange={(e)=>setB(Number(e.target.value))}
        />

        <br /><br />

        <h3>
          Rectángulos: {n}
        </h3>

        <input
            type="range"
            min="1"
            max="200"
            value={n}
            onChange={(e)=>
                setN(Number(e.target.value))
            }
        />

        <h2>
          Área Aproximada:
        </h2>

        <h1>
          {resultado.areaTotal.toFixed(4)}
        </h1>

        <Plot
            data={[
              {
                x,
                y,
                type:"scatter",
                mode:"lines"
              }
            ]}
            layout={{
              width:900,
              height:500,
              title:"Gráfico"
            }}
        />

        <table border={1}>
          <thead>
          <tr>
            <th>i</th>
            <th>x</th>
            <th>altura</th>
            <th>ancho</th>
            <th>área</th>
          </tr>
          </thead>

          <tbody>

          {
            resultado.puntos.map(
                (p:any)=>(
                    <tr key={p.intervalo}>
                      <td>{p.intervalo}</td>
                      <td>{p.x.toFixed(2)}</td>
                      <td>{p.altura.toFixed(2)}</td>
                      <td>{p.ancho.toFixed(2)}</td>
                      <td>{p.area.toFixed(2)}</td>
                    </tr>
                )
            )
          }

          </tbody>
        </table>

      </div>
  );
}

export default App;