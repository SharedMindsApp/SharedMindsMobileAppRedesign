import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GetHouseholdChatRequest {
  householdId: string;
  encryptedConversationKeys?: Record<string, string>;
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

    const body: GetHouseholdChatRequest = await req.json();

    if (!body.householdId) {
      return new Response(
        JSON.stringify({ error: "Household ID required" }),
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

    // Verify user is a member of this household
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id, role")
      .eq("household_id", body.householdId)
      .eq("user_id", userProfile.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a household conversation already exists
    const { data: existingConversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        id,
        type,
        household_id,
        title,
        created_at,
        updated_at
      `)
      .eq("household_id", body.householdId)
      .eq("type", "household")
      .maybeSingle();

    if (conversationError && conversationError.code !== "PGRST116") {
      return new Response(
        JSON.stringify({ error: "Failed to check for existing conversation", details: conversationError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If conversation exists, return it
    if (existingConversation) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select(`
          id,
          profile_id,
          role,
          joined_at,
          profiles:profile_id (
            id,
            full_name
          )
        `)
        .eq("conversation_id", existingConversation.id)
        .is("left_at", null);

      return new Response(
        JSON.stringify({
          conversation: existingConversation,
          participants: participants || [],
          created: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create new household conversation
    if (!body.encryptedConversationKeys || Object.keys(body.encryptedConversationKeys).length === 0) {
      return new Response(
        JSON.stringify({ error: "Encrypted conversation keys required to create new conversation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active household members (not professionals)
    const { data: householdMembers, error: membersError } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", body.householdId)
      .eq("status", "active")
      .not("user_id", "is", null);

    if (membersError || !householdMembers || householdMembers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active household members found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberIds = householdMembers.map(m => m.user_id).filter(Boolean);

    // Create conversation
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        type: "household",
        household_id: body.householdId,
        title: "Household Chat",
        created_by: userProfile.id,
      })
      .select()
      .single();

    if (createError || !newConversation) {
      return new Response(
        JSON.stringify({ error: "Failed to create conversation", details: createError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add all household members as participants
    const participantRecords = memberIds.map((memberId) => ({
      conversation_id: newConversation.id,
      profile_id: memberId,
      role: memberId === userProfile.id ? "admin" : "member",
      encrypted_conversation_key: body.encryptedConversationKeys[memberId] || "",
    }));

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .insert(participantRecords)
      .select(`
        id,
        profile_id,
        role,
        joined_at,
        profiles:profile_id (
          id,
          full_name
        )
      `);

    if (participantsError) {
      // Rollback: delete conversation
      await supabase.from("conversations").delete().eq("id", newConversation.id);
      return new Response(
        JSON.stringify({ error: "Failed to add participants", details: participantsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        conversation: newConversation,
        participants: participants || [],
        created: true,
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