import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type Demand = Database["public"]["Tables"]["demands"]["Row"];
export type CompanyPublic = Database["public"]["Views"]["companies_public"]["Row"];

export async function fetchCompaniesPublic(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return {} as Record<string, CompanyPublic>;
  const { data, error } = await supabase.from("companies_public").select("*").in("id", unique);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((c) => [c.id!, c])) as Record<string, CompanyPublic>;
}

export async function signedUrls(bucket: string, paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Ocurrió un error. Probá de nuevo.";
}
