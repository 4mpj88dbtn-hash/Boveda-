import type { Metadata } from "next";
import { ALL_ASSETS, assetById } from "@/modules/markets/catalog";
import { AssetView } from "@/modules/markets/asset-view";

/** Una página por activo del catálogo, generada al compilar (la app es estática). */
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_ASSETS.map((asset) => ({ id: asset.id }));
}

export async function generateMetadata({ params }: PageProps<"/mercados/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: assetById(id)?.nombre ?? "Activo" };
}

export default async function AssetPage({ params }: PageProps<"/mercados/[id]">) {
  const { id } = await params;
  return <AssetView id={id} />;
}
