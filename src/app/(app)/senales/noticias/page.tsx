import type { Metadata } from "next";
import { NewsView } from "@/modules/signals/news-view";
import { SignalsHeader } from "@/modules/signals/signals-header";

export const metadata: Metadata = { title: "Noticias" };

export default function NewsPage() {
  return (
    <>
      <SignalsHeader />
      <NewsView />
    </>
  );
}
