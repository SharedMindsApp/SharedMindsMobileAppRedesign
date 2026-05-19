import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  email: string;
  unsubscribeToken: string;
}

Deno.serve(async (req: Request) => {
  console.log("send-waitlist-confirmation function called");
  
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

    const { email, unsubscribeToken }: EmailRequest = await req.json();
    console.log("email:", email);
    console.log("has unsubscribe token:", !!unsubscribeToken);

    if (!email || typeof email !== "string") {
      console.error("Invalid email input:", email);
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

    if (!unsubscribeToken || typeof unsubscribeToken !== "string") {
      console.error("Invalid unsubscribe token");
      return new Response(
        JSON.stringify({ error: "Unsubscribe token is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@sharedminds.app";
    const appUrl = "https://sharedminds.app";
    const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}`;
    const logoUrl = `${appUrl}/logo-email.png`;
    
    console.log("has resend key:", !!resendApiKey);
    console.log("from email:", fromEmail);
    console.log("unsubscribe url:", unsubscribeUrl);

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured in environment");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SharedMinds</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 0; text-align: center;">
              <img src="${logoUrl}" alt="SharedMinds" style="width: 120px; height: auto; margin-bottom: 24px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 48px; text-align: center;">
              <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.2;">You're on the SharedMinds waitlist</h1>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #475569; text-align: left;">Thank you for joining us. We're building SharedMinds to help neurodivergent households navigate daily life with less stress and more harmony.</p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #475569; text-align: left;">We'll be opening beta access in stages over the coming weeks. When it's your turn, you'll receive an email with your invitation.</p>
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: left;">
                <p style="margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #0f172a;">What to expect:</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #475569;">Early access to SharedMinds beta<br>Updates on feature development<br>No spam or pressure, just meaningful updates<br>You can unsubscribe anytime</p>
              </div>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: left;">We're genuinely excited to have you join us on this journey.</p>
              <p style="margin: 16px 0 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: left;">The SharedMinds Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">This email was sent to ${email} because you signed up for the SharedMinds waitlist.</p>
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;"><a href="${unsubscribeUrl}" style="color: #3b82f6; text-decoration: none;">Unsubscribe anytime</a> | <a href="${appUrl}" style="color: #3b82f6; text-decoration: none;">Visit SharedMinds</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailText = `SHAREDMINDS\n\nYou're on the SharedMinds waitlist\n\nThank you for joining us. We're building SharedMinds to help neurodivergent households navigate daily life with less stress and more harmony.\n\nWe'll be opening beta access in stages over the coming weeks. When it's your turn, you'll receive an email with your invitation.\n\nWhat to expect:\nEarly access to SharedMinds beta\nUpdates on feature development\nNo spam or pressure, just meaningful updates\nYou can unsubscribe anytime\n\nWe're genuinely excited to have you join us on this journey.\n\nThe SharedMinds Team\n\n---\n\nThis email was sent to ${email} because you signed up for the SharedMinds waitlist.\n\nUnsubscribe anytime: ${unsubscribeUrl}\nVisit SharedMinds: ${appUrl}`;

    console.log("Calling Resend API...");
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "You're on the SharedMinds waitlist",
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resend API response status:", resendResponse.status);
    console.log("Resend API response:", resendData);

    if (!resendResponse.ok) {
      console.error("Resend API error - Status:", resendResponse.status);
      console.error("Resend API error - Data:", resendData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send confirmation email",
          details: resendData 
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

    console.log("Confirmation email sent successfully - Email ID:", resendData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent",
        emailId: resendData.id,
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
    console.error("Unexpected error in send-waitlist-confirmation:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ 
        error: "Failed to send confirmation email",
        message: error instanceof Error ? error.message : "Unknown error"
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
