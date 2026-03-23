import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Parse URL parameters
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before");

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "Conversation ID required" }),
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

    // Verify user is a participant
    const { data: participation, error: participationError } = await supabase
      .from("conversation_participants")
      .select("id, joined_at, encrypted_conversation_key")
      .eq("conversation_id", conversationId)
      .eq("profile_id", userProfile.id)
      .is("left_at", null)
      .maybeSingle();

    if (participationError || !participation) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this conversation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for messages
    let query = supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        ciphertext,
        nonce,
        message_type,
        has_attachments,
        created_at,
        edited_at,
        profiles:sender_id (
          id,
          full_name
        )
      `)
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Add before filter if provided
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages", details: messagesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return messages (RLS ensures user only sees messages since joined_at)
    return new Response(
      JSON.stringify({
        messages: (messages || []).map(msg => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          sender_name: msg.profiles?.full_name || "Unknown",
          ciphertext: msg.ciphertext,
          nonce: msg.nonce,
          message_type: msg.message_type,
          has_attachments: msg.has_attachments,
          created_at: msg.created_at,
          edited_at: msg.edited_at,
        })),
        encryptedConversationKey: participation.encrypted_conversation_key,
        hasMore: messages && messages.length === limit,
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