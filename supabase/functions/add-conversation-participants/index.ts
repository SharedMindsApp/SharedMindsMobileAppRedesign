import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AddParticipantsRequest {
  conversationId: string;
  participantIds: string[];
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

    const body: AddParticipantsRequest = await req.json();

    // Validate input
    if (!body.conversationId) {
      return new Response(
        JSON.stringify({ error: "Conversation ID required" }),
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

    // Get user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation and verify user is an admin
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, type, household_id")
      .eq("id", body.conversationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin of this conversation
    const { data: userParticipation, error: participationError } = await supabase
      .from("conversation_participants")
      .select("id, role")
      .eq("conversation_id", body.conversationId)
      .eq("profile_id", userProfile.id)
      .is("left_at", null)
      .maybeSingle();

    if (participationError || !userParticipation || userParticipation.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only conversation admins can add participants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all new participants
    const { data: participantProfiles, error: participantsError } = await supabase
      .from("profiles")
      .select("id, role")
      .in("id", body.participantIds);

    if (participantsError || !participantProfiles || participantProfiles.length !== body.participantIds.length) {
      return new Response(
        JSON.stringify({ error: "Invalid participant IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If conversation has a household, validate participants
    if (conversation.household_id) {
      for (const participant of participantProfiles) {
        if (participant.role === "professional") {
          // Check professional has approved access
          const { data: professionalAccess, error: accessError } = await supabase
            .from("professional_households")
            .select("id")
            .eq("professional_id", participant.id)
            .eq("household_id", conversation.household_id)
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
            .eq("household_id", conversation.household_id)
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

    // Check if participants are already in conversation
    const { data: existingParticipants } = await supabase
      .from("conversation_participants")
      .select("profile_id")
      .eq("conversation_id", body.conversationId)
      .in("profile_id", body.participantIds)
      .is("left_at", null);

    const existingIds = new Set(existingParticipants?.map(p => p.profile_id) || []);
    const newParticipantIds = body.participantIds.filter(id => !existingIds.has(id));

    if (newParticipantIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "All participants are already in this conversation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add new participants
    const participantRecords = newParticipantIds.map((participantId) => ({
      conversation_id: body.conversationId,
      profile_id: participantId,
      role: "member",
      encrypted_conversation_key: body.encryptedConversationKeys[participantId] || "",
    }));

    const { data: newParticipants, error: insertError } = await supabase
      .from("conversation_participants")
      .insert(participantRecords)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to add participants", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all current participants
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", body.conversationId)
      .is("left_at", null);

    return new Response(
      JSON.stringify({
        added: newParticipants,
        allParticipants,
      }),
      {
        status: 200,
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