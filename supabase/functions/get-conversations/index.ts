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

    // Get all conversations where user is a participant (RLS enforces this)
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select(`
        id,
        type,
        household_id,
        title,
        created_at,
        updated_at,
        is_archived
      `)
      .order("updated_at", { ascending: false });

    if (conversationsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch conversations", details: conversationsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      (conversations || []).map(async (conversation) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("id, sender_id, ciphertext, nonce, message_type, created_at")
          .eq("conversation_id", conversation.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get participant count
        const { count: participantCount } = await supabase
          .from("conversation_participants")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .is("left_at", null);

        // Get participants info
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select(`
            profile_id,
            role,
            profiles:profile_id (
              id,
              full_name
            )
          `)
          .eq("conversation_id", conversation.id)
          .is("left_at", null);

        return {
          ...conversation,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            sender_id: lastMessage.sender_id,
            ciphertext: lastMessage.ciphertext,
            nonce: lastMessage.nonce,
            message_type: lastMessage.message_type,
            created_at: lastMessage.created_at,
          } : null,
          participantCount: participantCount || 0,
          participants: participants || [],
        };
      })
    );

    return new Response(
      JSON.stringify({
        conversations: conversationsWithLastMessage,
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