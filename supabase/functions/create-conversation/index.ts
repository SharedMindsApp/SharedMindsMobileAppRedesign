import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateConversationRequest {
  type: "household" | "direct" | "group";
  householdId?: string | null;
  participantIds: string[];
  title?: string;
  encryptedConversationKeys: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateConversationRequest = await req.json();

    // Validate input
    if (!body.type || !["household", "direct", "group"].includes(body.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid conversation type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.participantIds || body.participantIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Participant IDs required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.encryptedConversationKeys || Object.keys(body.encryptedConversationKeys).length === 0) {
      return new Response(
        JSON.stringify({ error: "Encrypted conversation keys required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Direct chats must have exactly 2 participants
    if (body.type === "direct" && body.participantIds.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Direct chats must have exactly 2 participants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get creator's profile
    const { data: creatorProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !creatorProfile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate household membership if type is household
    if (body.type === "household") {
      if (!body.householdId) {
        return new Response(
          JSON.stringify({ error: "Household ID required for household conversations" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", body.householdId)
        .eq("user_id", creatorProfile.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError || !membership) {
        return new Response(
          JSON.stringify({ error: "You must be a member of this household" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate all participants
    const { data: participantProfiles, error: participantsError } = await supabase
      .from("profiles")
      .select("id, role, user_id")
      .in("id", body.participantIds);

    if (participantsError || !participantProfiles || participantProfiles.length !== body.participantIds.length) {
      return new Response(
        JSON.stringify({ error: "Invalid participant IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If household conversation, validate participants
    if (body.householdId) {
      for (const participant of participantProfiles) {
        if (participant.role === "professional") {
          // Check professional has approved access
          const { data: professionalAccess, error: accessError } = await supabase
            .from("professional_households")
            .select("id")
            .eq("professional_id", participant.id)
            .eq("household_id", body.householdId)
            .eq("status", "approved")
            .maybeSingle();

          if (accessError || !professionalAccess) {
            return new Response(
              JSON.stringify({ error: `Professional does not have approved access to this household` }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Check household member
          const { data: householdMember, error: memberError } = await supabase
            .from("household_members")
            .select("id")
            .eq("household_id", body.householdId)
            .eq("user_id", participant.id)
            .eq("status", "active")
            .maybeSingle();

          if (memberError || !householdMember) {
            return new Response(
              JSON.stringify({ error: `Participant is not a member of this household` }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Create conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        type: body.type,
        household_id: body.householdId || null,
        title: body.title || null,
        created_by: creatorProfile.id,
      })
      .select()
      .single();

    if (conversationError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Failed to create conversation", details: conversationError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add participants
    const participantRecords = body.participantIds.map((participantId) => ({
      conversation_id: conversation.id,
      profile_id: participantId,
      role: participantId === creatorProfile.id ? "admin" : "member",
      encrypted_conversation_key: body.encryptedConversationKeys[participantId] || "",
    }));

    const { data: participants, error: participantsInsertError } = await supabase
      .from("conversation_participants")
      .insert(participantRecords)
      .select();

    if (participantsInsertError) {
      // Rollback: delete conversation
      await supabase.from("conversations").delete().eq("id", conversation.id);
      return new Response(
        JSON.stringify({ error: "Failed to add participants", details: participantsInsertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        conversation,
        participants,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});