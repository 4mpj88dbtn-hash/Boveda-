import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { EducationalNotice } from "@/components/ui/notices";

type Lesson = { id: string; title: string; body: ReactNode };

/** Lecciones cortas de §5.4. Conceptos de uso general; no son señales ni recomendaciones. */
const LESSONS: Lesson[] = [
  {
    id: "ordenes",
    title: "Tipos de órdenes",
    body: (
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        <li>
          <b>De mercado:</b> se ejecuta de inmediato al mejor precio disponible. Es rápida, pero no controlas el precio exacto: la
          diferencia se llama deslizamiento.
        </li>
        <li>
          <b>Limitada:</b> fijas el precio máximo al que compras (o el mínimo al que vendes). Solo se ejecuta a ese precio o a uno
          mejor, y puede no ejecutarse nunca.
        </li>
        <li>
          <b>Stop (stop loss):</b> cuando el precio toca tu nivel, se convierte en orden de mercado. Sirve para limitar la pérdida;
          si el precio abre con un hueco, se ejecuta peor que tu stop.
        </li>
        <li>
          <b>Stop-limit:</b> al tocar el stop se convierte en orden limitada. Controlas el precio, pero si el precio salta tu límite
          la orden se queda sin ejecutar y sigues dentro.
        </li>
        <li>
          <b>Trailing stop:</b> un stop que sigue al precio a una distancia fija (en dinero o en %) cuando va a tu favor y no se
          mueve cuando va en contra. Protege ganancias sin cerrar antes de tiempo.
        </li>
      </ul>
    ),
  },
  {
    id: "niveles",
    title: "Soportes y resistencias",
    body: (
      <p>
        Son zonas donde el precio se ha detenido antes. Un <b>soporte</b> está abajo: ahí han aparecido compradores. Una{" "}
        <b>resistencia</b> está arriba: ahí han aparecido vendedores. Cuantas más veces se respeta una zona, más importante es. Cuando
        se rompe con fuerza, suele cambiar de papel: la resistencia rota se vuelve soporte. Piensa en zonas, no en precios exactos.
      </p>
    ),
  },
  {
    id: "tendencias",
    title: "Tendencias",
    body: (
      <p>
        <b>Alcista:</b> máximos y mínimos cada vez más altos. <b>Bajista:</b> máximos y mínimos cada vez más bajos. <b>Lateral:</b> el
        precio rebota entre un soporte y una resistencia. Operar a favor de la tendencia pone las probabilidades de tu lado; ir en
        contra exige más confirmación. Una línea que une los mínimos (o los máximos) ayuda a verla.
      </p>
    ),
  },
  {
    id: "medias",
    title: "Medias móviles",
    body: (
      <p>
        El promedio de los últimos cierres: la MA50 usa 50 y la MA200 usa 200 (las ves en Mercados). Suavizan el ruido y muestran la
        dirección. Muchos inversionistas consideran alcista el largo plazo cuando el precio está arriba de la MA200. Cuando la MA50
        cruza arriba de la MA200 se le llama &ldquo;cruce dorado&rdquo;; abajo, &ldquo;cruce de la muerte&rdquo;. Ojo: siempre van
        atrasadas, porque se calculan con precios pasados.
      </p>
    ),
  },
  {
    id: "rsi",
    title: "RSI (índice de fuerza relativa)",
    body: (
      <p>
        Mide de 0 a 100 qué tan fuertes han sido las subidas contra las bajadas, normalmente en 14 periodos. Arriba de 70 se dice
        &ldquo;sobrecompra&rdquo; y abajo de 30, &ldquo;sobreventa&rdquo;. No es una orden de vender o comprar: en tendencias fuertes
        el RSI puede quedarse arriba de 70 (o abajo de 30) mucho tiempo. Úsalo para confirmar, no como única razón.
      </p>
    ),
  },
  {
    id: "macd",
    title: "MACD",
    body: (
      <p>
        Es la diferencia entre dos medias móviles exponenciales (de 12 y 26 periodos). La &ldquo;línea de señal&rdquo; es la media de
        9 periodos del propio MACD, y el histograma muestra la distancia entre las dos. Cuando el MACD cruza arriba de su señal, el
        impulso mejora; abajo, se debilita. Como las medias, va atrasado y da señales falsas en mercados laterales.
      </p>
    ),
  },
  {
    id: "volumen",
    title: "Volumen",
    body: (
      <p>
        Cuántos títulos se negociaron en el periodo. Confirma los movimientos: una ruptura de resistencia con volumen alto es más
        confiable que una con volumen bajo, y una subida con volumen cada vez menor muestra menos convicción.
      </p>
    ),
  },
  {
    id: "velas",
    title: "Velas japonesas",
    body: (
      <p>
        Cada vela muestra apertura, máximo, mínimo y cierre del periodo. El cuerpo va de la apertura al cierre (verde si cerró arriba,
        rojo si cerró abajo) y las mechas marcan los extremos. Algunos patrones conocidos: el <b>martillo</b> (mecha inferior larga:
        se rechazaron precios bajos), la <b>envolvente</b> (un cuerpo que cubre por completo al anterior) y el <b>doji</b> (apertura y
        cierre casi iguales: indecisión). Un patrón solo vale en contexto: en un nivel clave y a favor de la tendencia.
      </p>
    ),
  },
  {
    id: "temporalidades",
    title: "Temporalidades",
    body: (
      <p>
        La misma acción se ve distinta en velas de 5 minutos, diarias o semanales. Una regla útil: define la tendencia en una
        temporalidad mayor (por ejemplo, diaria) y busca tu entrada en una menor (por ejemplo, 30 minutos). Entre más corta, más
        ruido, más operaciones, más comisiones y más estrés.
      </p>
    ),
  },
  {
    id: "apalancamiento",
    title: "Apalancamiento y sus riesgos",
    body: (
      <p>
        Es operar con dinero prestado (margen, CFD, futuros). Multiplica las ganancias y también las pérdidas: con apalancamiento de
        10 a 1, un movimiento de 10% en tu contra borra todo tu dinero, y puedes deber más si el precio abre con un hueco. Por eso
        los productos apalancados son donde más pierden los pequeños inversionistas. El Simulador no usa apalancamiento.
      </p>
    ),
  },
  {
    id: "cripto",
    title: "Cripto: 24/7 y volátil",
    body: (
      <p>
        El mercado de cripto nunca cierra, ni de noche ni en fin de semana: el precio se mueve mientras duermes. Suele moverse mucho
        más que una acción grande en el mismo tiempo, así que el mismo stop en % te saca más seguido y el tamaño de posición debe ser
        menor. Además de los precios, hay riesgos de plataforma, de custodia y de regulación.
      </p>
    ),
  },
  {
    id: "psicologia",
    title: "Psicología: FOMO, revancha y sobreoperar",
    body: (
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        <li>
          <b>FOMO</b> (miedo a quedarte fuera): entras tarde, después de una gran subida, sin tu checklist. Si ya se fue, déjalo ir:
          habrá otra oportunidad.
        </li>
        <li>
          <b>Operar por revancha:</b> después de una pérdida quieres recuperarla de inmediato, con más tamaño. Es la forma más rápida
          de convertir una mala operación en un mal mes. Para eso existen tus límites de pérdida.
        </li>
        <li>
          <b>Sobreoperar:</b> muchas operaciones por aburrimiento o ansiedad. Más comisiones y más errores. Menos, pero mejores.
        </li>
        <li>Lo que ayuda: plan escrito, checklist, límites diarios, una pausa después de dos pérdidas seguidas y tu diario.</li>
      </ul>
    ),
  },
];

/** Lecciones cortas de trading, una por tema. */
export function LessonsView() {
  return (
    <>
      <p className="max-w-[65ch] text-interfaz text-texto-2">
        Doce temas en lectura de dos minutos. Ningún indicador funciona solo: combínalos con tu plan y tu regla de riesgo.
      </p>
      <div className="flex flex-col gap-2">
        {LESSONS.map((lesson) => (
          <details key={lesson.id} className="group rounded-tarjeta border border-borde bg-superficie">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-interfaz font-medium [&::-webkit-details-marker]:hidden">
              {lesson.title}
              <ChevronDown aria-hidden className="size-5 shrink-0 text-texto-2 transition-transform duration-200 ease-boveda group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="border-t border-borde px-4 py-3 text-interfaz leading-relaxed">{lesson.body}</div>
          </details>
        ))}
      </div>
      <EducationalNotice />
    </>
  );
}
