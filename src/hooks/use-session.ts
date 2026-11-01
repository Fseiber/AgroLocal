import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, ready };
}

export type Membership = {
  role: "admin" | "operator" | "viewer";
  company: {
    id: string;
    name: string;
    cuit: string;
    province: string;
    locality: string;
    activity_type: string;
    intent: "sell" | "buy" | "both";
    contact_phone: string;
    contact_email: string;
    verification_status: string;
    verification_note: string | null;
  };
};

/** Current user's company membership + platform-admin flag. */
export function useMe(userId: string | undefined) {
  return useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      await supabase.rpc("accept_pending_invitations");
      const [{ data: members, error }, { data: isAdmin }] = await Promise.all([
        supabase
          .from("company_members")
          .select("role, company:companies(id,name,cuit,province,locality,activity_type,intent,contact_phone,contact_email,verification_status,verification_note)")
          .eq("user_id", userId!),
        supabase.rpc("has_role", { _user_id: userId!, _role: "admin" }),
      ]);
      if (error) throw error;
      const memberships = (members ?? []).filter((m) => m.company) as unknown as Membership[];
      return { memberships, membership: memberships[0] ?? null, isPlatformAdmin: !!isAdmin };
    },
  });
}

export const canOperate = (m: Membership | null) =>
  !!m && (m.role === "admin" || m.role === "operator") && m.company.verification_status === "verified";
