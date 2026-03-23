import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendMessageRequest {
  conversationId: string;
  ciphertext: string;
  nonce: string;
  messageType?: "text" | "system" | "info";
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

    const body: SendMessageRequest = await req.json();

    // Validate input
    if (!body.conversationId) {
      return new Response(
        JSON.stringify({ error: "Conversation ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.ciphertext || !body.nonce) {
      return new Response(
        JSON.stringify({ error: "Ciphertext and nonce required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageType = body.messageType || "text";
    if (!["text", "system", "info"].includes(messageType)) {
      return new Response(
        JSON.stringify({ error: "Invalid message type" }),
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

    // Verify conversation exists and user is a participant
    const { data: participation, error: participationError } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", body.conversationId)
      .eq("profile_id", userProfile.id)
      .is("left_at", null)
      .maybeSingle();

    if (participationError || !participation) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this conversation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert message (RLS will enforce additional checks)
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: body.conversationId,
        sender_id: userProfile.id,
        ciphertext: body.ciphertext,
        nonce: body.nonce,
        message_type: messageType,
      })
      .select()
      .single();

    if (messageError || !message) {
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: messageError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          ciphertext: message.ciphertext,
          nonce: message.nonce,
          message_type: message.message_type,
          created_at: message.created_at,
        },
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