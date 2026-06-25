import { useState } from "react";
import { calcularRiemann } from "./utils/riemann";
import { evaluate } from "mathjs";
import Plot from "react-plotly.js";


type Rectangulo = {

    type: "rect";

    x0: number;
    x1: number;

    y0: number;
    y1: number;

    line?: {
        width:number;
    };

    fillcolor?: string;

};

function generarRectangulos(
    funcion:string,
    a:number,
    b:number,
    n:number
){

    const dx = (b-a)/n;

    const shapes:Rectangulo[]=[];


    for(let i=0;i<n;i++){

        const xi = a + i*dx;


        let altura:number =
            Number(
                evaluate(
                    funcion,
                    {
                        x:xi
                    }
                )
            );


        if(
            altura < 0
        ){

            altura = 0;

        }


        shapes.push({

            type:"rect",


            x0:xi,
            x1:xi+dx,

            y0:0,
            y1:altura,

            line:{
                width:1
            },

            fillcolor:
                "rgba(0,150,255,0.35)"

        });

    }


    return shapes;

}



function App() {


    const [funcion,setFuncion] =
        useState("x^2");


    const [a,setA] =
        useState(0);


    const [b,setB] =
        useState(10);


    const [n,setN] =
        useState(10);


    const [error,setError] =
        useState("");


    function validarIntervalo(
        nuevoA:number,
        nuevoB:number
    ){

        if(nuevoA >= nuevoB){

            setError(
                "⚠️ El valor de 'a' debe ser menor que 'b'"
            );

            return false;

        }


        setError("");

        return true;

    }

    const resultado =
        calcularRiemann(
            funcion,
            a,
            b,
            n
        );




    // ------------------------
    // CURVA DE LA FUNCIÓN
    // ------------------------

    const x:number[]=[];
    const y:(number | null)[]=[];



    for(
        let i=a;
        i<=b;
        i+=0.05
    ){

        x.push(i);


        try {

            const valor =
                evaluate(
                    funcion,
                    {
                        x:i
                    }
                );


            if(
                typeof valor === "number"
                && isFinite(valor)
            ){

                y.push(valor);

            }else{

                y.push(null);

            }


        }

        catch{

            y.push(null);

        }

    }



    // ------------------------
    // RECTÁNGULOS
    // ------------------------

    const rectangulos =
        generarRectangulos(
            funcion,
            a,
            b,
            n
        );





    return (

        <div
            style={{
                padding:"25px",
                fontFamily:"Arial"
            }}
        >


            <h1>
                Integración Numérica
            </h1>



            <div>

                <label>
                    Función:
                </label>


                <input

                    style={{
                        width:"250px",
                        marginLeft:"10px"
                    }}

                    value={funcion}

                    onChange={
                        (e)=>
                            setFuncion(e.target.value)
                    }

                />
                <select

                    onChange={(e)=>{

                        setFuncion(e.target.value)

                    }}

                    style={{
                        marginLeft:"10px"
                    }}

                >

                    <option value="x^2">
                        x²
                    </option>


                    <option value="x^3">
                        x³
                    </option>


                    <option value="sin(x)">
                        sin(x)
                    </option>


                    <option value="cos(x)">
                        cos(x)
                    </option>


                    <option value="tan(x)">
                        tan(x)
                    </option>


                    <option value="sqrt(x)">
                        √x
                    </option>


                    <option value="log(x)">
                        log(x)
                    </option>


                    <option value="exp(x)">
                        eˣ
                    </option>


                    <option value="abs(x)">
                        |x|
                    </option>


                    <option value="x^2+2*x+1">
                        x²+2x+1
                    </option>


                </select>
                <p>
                    Funciones aceptadas:
                    x, +, -, *, /, ^,
                    sin, cos, tan, sqrt, log
                </p>

            </div>



            <br/>




            <label>
                Valor a:
            </label>

            <input

                type="number"

                value={a}

                onChange={
                    (e)=>{

                        const valor =
                            Number(e.target.value);


                        if(
                            validarIntervalo(
                                valor,
                                b
                            )
                        ){

                            setA(valor);

                        }

                    }
                }

            />



            <br/><br/>




            <label>
                Valor b:
            </label>


            <input

                type="number"

                value={b}

                onChange={
                    (e)=>{

                        const valor =
                            Number(e.target.value);


                        if(
                            validarIntervalo(
                                a,
                                valor
                            )
                        ){

                            setB(valor);

                        }

                    }
                }

            />






            <br/><br/>



            <h2>
                Rectángulos: {n}
            </h2>



            <input

                type="range"

                min="1"

                max="300"

                value={n}

                style={{
                    width:"500px"
                }}

                onChange={
                    (e)=>
                        setN(Number(e.target.value))
                }

            />

            {
                error &&
                (
                    <h3
                        style={{
                            color:"red"
                        }}
                    >

                        {error}

                    </h3>
                )
            }



            <h3>

                Δx =

                {
                    resultado.dx.toFixed(5)
                }

            </h3>




            <h2>
                Área aproximada:
            </h2>


            <h1>

                {
                    resultado.areaTotal.toFixed(6)
                }

            </h1>






            <Plot


                data={[
                    {

                        x,

                        y,

                        type:"scatter",

                        mode:"lines",

                        name:"f(x)"

                    }

                ]}



                layout={{

                    width:1000,

                    height:600,

                    title:
                        "Curva + Rectángulos de Riemann",


                    shapes:
                    rectangulos,


                    xaxis:{

                        title:"Eje X",

                        zeroline:true

                    },


                    yaxis:{

                        title:"f(x)"

                    }

                }}


                config={{

                    responsive:true,

                    scrollZoom:true

                }}



            />







            <h2>
                Detalle de intervalos
            </h2>




            <table

                border={1}

                cellPadding={8}

            >

                <thead>

                <tr>

                    <th>
                        i
                    </th>

                    <th>
                        x
                    </th>

                    <th>
                        Altura
                    </th>

                    <th>
                        Ancho
                    </th>

                    <th>
                        Área
                    </th>

                </tr>

                </thead>



                <tbody>


                {
                    resultado.puntos.map(
                        (p)=>(

                            <tr
                                key={p.intervalo}
                            >

                                <td>
                                    {p.intervalo}
                                </td>


                                <td>
                                    {p.x.toFixed(4)}
                                </td>


                                <td>
                                    {p.altura.toFixed(4)}
                                </td>


                                <td>
                                    {p.ancho.toFixed(4)}
                                </td>


                                <td>
                                    {p.area.toFixed(4)}
                                </td>


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