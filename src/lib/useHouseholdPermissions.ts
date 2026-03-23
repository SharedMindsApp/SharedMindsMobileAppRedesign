import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useHouseholdPermissions(householdId: string) {
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setRole("viewer");
        setLoading(false);
        return;
      }

      // get profile.id for correct joins
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq('id', auth.user.id)
        .single();

      if (!profile) {
        setRole("viewer");
        setLoading(false);
        return;
      }

      // Admin should override household role
      if (profile.role === "admin") {
        setRole("owner");
        setLoading(false);
        return;
      }

      const { data: membership, error } = await supabase
        .from("space_members")
        .select("role")
        .eq("space_id", householdId)
        .eq("user_id", profile.id) // <- correct foreign key
        .maybeSingle();

      if (error || !membership) {
        setRole("viewer");
      } else {
        setRole(membership.role as any);
      }

      setLoading(false);
    }

    loadPermissions();
  }, [householdId]);

  const canEdit = role === "owner" || role === "editor";

  return { role, canEdit, loading };
}
