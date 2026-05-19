import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  console.log("unsubscribe function called");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    console.log("Unsubscribe token:", token ? `${token.substring(0, 8)}...` : "null");

    if (!token || typeof token !== "string" || token.length < 10) {
      console.error("Invalid or missing token");
      return new Response(
        JSON.stringify({ 
          error: "Invalid unsubscribe link",
          message: "The unsubscribe link is invalid or expired. Please contact support if you continue to receive emails."
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("has supabase url:", !!supabaseUrl);
    console.log("has service role key:", !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Looking up waitlist entry by token...");
    const { data: waitlistEntry, error: lookupError } = await supabaseAdmin
      .from("waitlist")
      .select("id, email, subscribed, unsubscribed_at")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (lookupError) {
      console.error("Database lookup error:", lookupError);
      return new Response(
        JSON.stringify({ error: "Unable to process unsubscribe request" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!waitlistEntry) {
      console.error("No waitlist entry found for token");
      return new Response(
        JSON.stringify({ 
          error: "Invalid unsubscribe link",
          message: "This unsubscribe link is not valid. If you continue to receive emails, please contact support."
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Found waitlist entry:", waitlistEntry.id);
    console.log("Email:", waitlistEntry.email);
    console.log("Currently subscribed:", waitlistEntry.subscribed);

    if (!waitlistEntry.subscribed) {
      console.log("User already unsubscribed at:", waitlistEntry.unsubscribed_at);
      return new Response(
        JSON.stringify({
          success: true,
          message: "You're already unsubscribed",
          email: waitlistEntry.email,
          alreadyUnsubscribed: true,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Unsubscribing user...");
    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from("waitlist")
      .update({
        subscribed: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", waitlistEntry.id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Unable to process unsubscribe request" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Successfully unsubscribed:", updatedEntry.email);
    console.log("Unsubscribed at:", updatedEntry.unsubscribed_at);

    return new Response(
      JSON.stringify({
        success: true,
        message: "You've been unsubscribed",
        email: updatedEntry.email,
        unsubscribedAt: updatedEntry.unsubscribed_at,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error in unsubscribe:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ 
        error: "Something went wrong",
        message: "Unable to process your unsubscribe request. Please try again or contact support."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
