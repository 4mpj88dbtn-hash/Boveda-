import { EducationalNotice, PhaseTag } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  phase: number;
  features: string[];
  /** Muestra el aviso educativo (inversión, mercados y trading). */
  educational?: boolean;
};

/** Pantalla de una sección que llega en una fase posterior: dice qué traerá y cuándo. */
export function SectionPlaceholder({ title, description, phase, features, educational }: SectionPlaceholderProps) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display lg:text-display-lg">{title}</h1>
        <p className="max-w-[65ch] text-interfaz text-texto-2">{description}</p>
      </header>
      <Panel title="Lo que vas a encontrar aquí" action={<PhaseTag phase={phase} />}>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-interfaz marker:text-borde-control">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </Panel>
      {educational ? <EducationalNotice /> : null}
    </>
  );
}
