const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OWNER_EMAIL = "bambanghrmko@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, email, otp } = await req.json();

    if (action === "send") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("otp_codes").delete().eq("email", email);

      const { error: insertError } = await supabase.from("otp_codes").insert({
        email,
        code,
        expires_at,
      });

      if (insertError) throw insertError;

      // Send OTP email via Resend
      let emailSent = false;
      if (resendApiKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Super Computer <onboarding@resend.dev>",
              to: [OWNER_EMAIL],
              subject: `Kode OTP Registrasi Owner - ${code}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #1a1a1a; margin-bottom: 8px;">Super Computer Apps</h2>
                  <p style="color: #555;">Seseorang dengan email <strong>${email}</strong> meminta registrasi sebagai Owner.</p>
                  <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <p style="color: #888; margin: 0 0 8px;">Kode OTP Anda:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; margin: 0;">${code}</p>
                  </div>
                  <p style="color: #888; font-size: 13px;">Kode berlaku selama 10 menit. Abaikan email ini jika Anda tidak memintanya.</p>
                </div>
              `,
            }),
          });

          if (res.ok) {
            emailSent = true;
            console.log(`OTP email sent to ${OWNER_EMAIL} for registration by ${email}`);
          } else {
            const errBody = await res.text();
            console.error(`Resend API error: ${res.status} ${errBody}`);
          }
        } catch (emailErr) {
          console.error("Failed to send email via Resend:", emailErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent
            ? `Kode OTP telah dikirim ke email owner (${OWNER_EMAIL.replace(/(.{3}).*(@.*)/, "$1***$2")})`
            : `Kode OTP telah dibuat. Cek halaman registrasi untuk Dev OTP.`,
          dev_otp: emailSent ? undefined : code,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "verify") {
      const { data: stored, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!stored) {
        return new Response(
          JSON.stringify({ success: false, message: "Kode OTP tidak ditemukan. Silakan minta kode baru." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (new Date() > new Date(stored.expires_at)) {
        await supabase.from("otp_codes").delete().eq("email", email);
        return new Response(
          JSON.stringify({ success: false, message: "Kode OTP sudah kedaluwarsa. Silakan minta kode baru." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (stored.code !== otp) {
        return new Response(
          JSON.stringify({ success: false, message: "Kode OTP salah." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      await supabase.from("otp_codes").delete().eq("email", email);
      return new Response(
        JSON.stringify({ success: true, message: "OTP terverifikasi." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
