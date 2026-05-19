import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WaitlistRequest {
  email: string;
  source?: string;
}

function generateUnsubscribeToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sendConfirmationEmail(email: string, unsubscribeToken: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      console.error("SUPABASE_URL not found in environment");
      return;
    }
    
    const emailUrl = `${supabaseUrl}/functions/v1/send-waitlist-confirmation`;
    console.log("Triggering confirmation email to:", email);
    
    const response = await fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribeToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send confirmation email - Status:", response.status);
      console.error("Failed to send confirmation email - Error:", errorData);
    } else {
      const successData = await response.json();
      console.log("Confirmation email sent successfully:", successData);
    }
  } catch (error) {
    console.error("Error calling send-waitlist-confirmation:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
  }
}

Deno.serve(async (req: Request) => {
  console.log("join-waitlist function called");
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, source = "landing_page" }: WaitlistRequest = await req.json();
    console.log("Received email:", email);
    console.log("Source:", source);

    if (!email || typeof email !== "string") {
      console.error("Invalid email:", email);
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
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

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Normalized email:", normalizedEmail);

    console.log("Checking for existing email...");
    const { data: existingEntry, error: checkError } = await supabaseAdmin
      .from("waitlist")
      .select("id, email, subscribed, unsubscribe_token")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError) {
      console.error("Database check error:", checkError);
      return new Response(
        JSON.stringify({ error: "Unable to join waitlist. Please try again." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (existingEntry) {
      console.log("Email already exists:", existingEntry.id);
      console.log("Currently subscribed:", existingEntry.subscribed);
      
      if (!existingEntry.subscribed) {
        console.log("Re-subscribing previously unsubscribed user");
        const { data: resubscribedEntry, error: updateError } = await supabaseAdmin
          .from("waitlist")
          .update({
            subscribed: true,
            unsubscribed_at: null,
          })
          .eq("id", existingEntry.id)
          .select()
          .single();

        if (updateError) {
          console.error("Database update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Unable to rejoin waitlist. Please try again." }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        console.log("Successfully re-subscribed:", resubscribedEntry.id);
        
        sendConfirmationEmail(normalizedEmail, existingEntry.unsubscribe_token).catch((err) => {
          console.error("Background email send failed:", err);
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Welcome back! You're on the waitlist. Check your email for confirmation.",
            data: { id: resubscribedEntry.id, email: resubscribedEntry.email },
          }),
          {
            status: 201,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "You're already on the list. We'll email you when early access opens.",
          alreadyExists: true 
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const unsubscribeToken = generateUnsubscribeToken();
    console.log("Generated unsubscribe token:", unsubscribeToken.substring(0, 8) + "...");

    console.log("Inserting new email into waitlist...");
    const { data, error: insertError } = await supabaseAdmin
      .from("waitlist")
      .insert({
        email: normalizedEmail,
        source,
        status: "waitlisted",
        subscribed: true,
        unsubscribe_token: unsubscribeToken,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      console.error("Error code:", insertError.code);
      console.error("Error details:", insertError.details);
      return new Response(
        JSON.stringify({ error: "Unable to join waitlist. Please try again." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Successfully inserted:", data.id);

    sendConfirmationEmail(normalizedEmail, unsubscribeToken).catch((err) => {
      console.error("Background email send failed:", err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "You're on the waitlist. Check your email for confirmation.",
        data: { id: data.id, email: data.email },
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error in join-waitlist:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
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
