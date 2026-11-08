import { cn } from "@/lib/utils";

export type LineSeries = {
  label: string;
  /** Token de color: laton, acero, positivo, texto-2… */
  color: "laton" | "acero" | "positivo" | "negativo-texto" | "texto-2";
  values: (number | null)[];
  dashed?: boolean;
};

const STROKE: Record<LineSeries["color"], string> = {
  laton: "stroke-laton",
  acero: "stroke-acero",
  positivo: "stroke-positivo",
  "negativo-texto": "stroke-negativo-texto",
  "texto-2": "stroke-texto-2",
};
const DOT: Record<LineSeries["color"], string> = {
  laton: "bg-laton",
  acero: "bg-acero",
  positivo: "bg-positivo",
  "negativo-texto": "bg-negativo-texto",
  "texto-2": "bg-texto-2",
};

/**
 * Gráfica de líneas simple en SVG (proyecciones, aportado contra valor). Escala lineal común a
 * todas las series; etiquetas del eje con los valores reales mínimo y máximo.
 */
export function LineChart({
  series,
  labels,
  format,
  ariaLabel,
  height = 200,
  includeZero = true,
}: {
  series: LineSeries[];
  labels: string[];
  format: (value: number) => string;
  ariaLabel: string;
  height?: number;
  /** Con false la escala se ajusta a los datos (curva de capital); con true parte de cero. */
  includeZero?: boolean;
}) {
  const width = 640;
  const pad = { top: 18, right: 8, bottom: 26, left: 8 };
  const all = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
  if (all.length === 0 || labels.length < 2) return null;
  let min = includeZero ? Math.min(...all, 0) : Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const x = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / (labels.length - 1);
  const y = (value: number) => pad.top + ((max - value) * (height - pad.top - pad.bottom)) / (max - min);
  const path = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((value, index) => {
      if (value === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  const ticks = labels.length <= 6 ? labels.map((_, index) => index) : [0, Math.floor((labels.length - 1) / 2), labels.length - 1];

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        <line x1={pad.left} x2={width - pad.right} y1={y(max)} y2={y(max)} className="stroke-borde" strokeWidth={1} />
        <line x1={pad.left} x2={width - pad.right} y1={y(min)} y2={y(min)} className="stroke-borde" strokeWidth={1} />
        <text x={pad.left} y={y(max) - 5} className="fill-texto-2 text-[11px]">
          {format(max)}
        </text>
        <text x={pad.left} y={y(min) - 5} className="fill-texto-2 text-[11px]">
          {format(min)}
        </text>
        {series.map((item) => (
          <path
            key={item.label}
            d={path(item.values)}
            className={cn("fill-none", STROKE[item.color])}
            strokeWidth={2}
            strokeDasharray={item.dashed ? "5 4" : undefined}
            strokeLinejoin="round"
          />
        ))}
        {ticks.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 8}
            textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
            className="fill-texto-2 text-[11px]"
          >
            {labels[index]}
          </text>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-etiqueta text-texto-2">
        {series.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-0.5 w-4", DOT[item.color])} />
            {item.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
