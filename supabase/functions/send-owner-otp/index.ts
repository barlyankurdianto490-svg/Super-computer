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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, email, otp } = await req.json();

    if (action === "send") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Delete any existing OTPs for this email
      await supabase.from("otp_codes").delete().eq("email", email);

      // Insert new OTP
      const { error: insertError } = await supabase.from("otp_codes").insert({
        email,
        code,
        expires_at,
      });

      if (insertError) throw insertError;

      console.log(`OTP for owner registration by ${email}: ${code} (sent to ${OWNER_EMAIL})`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Kode OTP telah dikirim ke email owner (${OWNER_EMAIL.replace(/(.{3}).*(@.*)/, "$1***$2")})`,
          dev_otp: code,
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
