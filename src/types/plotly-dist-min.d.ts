declare module 'plotly.js-dist-min' {
  interface PlotlyAPI {
    newPlot: (element: HTMLElement, data: unknown, layout: unknown, config: unknown) => Promise<void>;
    toImage: (element: HTMLElement, options: unknown) => Promise<string>;
    downloadImage: (element: HTMLElement, options: unknown) => Promise<void>;
  }

  const Plotly: PlotlyAPI;
  export default Plotly;
}
