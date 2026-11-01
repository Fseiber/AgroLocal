import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/panel-shell";
import { ListingForm } from "@/components/listing-form";
import { canOperate } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/panel/publicar/cascara")({
  head: () => ({ meta: [{ title: "Publicar arroz con cáscara — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Publicá un lote de arroz con cáscara." }, { property: "og:title", content: "Publicar arroz con cáscara — AgroLocal" }, { property: "og:description", content: "Publicá un lote de arroz con cáscara." }] }),
  component: () => (
    <PanelShell title="Publicar arroz con cáscara">
      {({ membership, userId }) => canOperate(membership)
        ? <ListingForm product="cascara" m={membership!} userId={userId} />
        : <p>Tu empresa debe estar verificada y necesitás permiso de operador para publicar.</p>}
    </PanelShell>
  ),
});
