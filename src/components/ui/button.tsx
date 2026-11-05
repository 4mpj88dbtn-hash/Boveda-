import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 rounded-control font-sans font-semibold",
    "transition-[background-color,border-color,color,filter] duration-120 ease-boveda",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primario: "bg-laton text-sobre-laton hover:brightness-110 active:brightness-95",
        secundario: "border border-borde-control text-texto hover:bg-elevada",
        fantasma: "text-texto hover:bg-elevada",
        enlace: "text-laton underline underline-offset-4 hover:text-texto",
      },
      size: {
        md: "h-11 px-4 text-interfaz",
        lg: "h-12 px-5 text-cuerpo",
        icono: "size-11",
      },
    },
    defaultVariants: { variant: "primario", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
