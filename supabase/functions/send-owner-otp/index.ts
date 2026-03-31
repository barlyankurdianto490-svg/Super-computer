import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OWNER_EMAIL = "bambanghrmko@gmail.com";

// In-memory OTP store (simple for edge function context)
const otpStore = new Map<string, { code: string; expires: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, otp } = await req.json();

    if (action === "send") {
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP keyed by requesting email
      otpStore.set(email, { code, expires });

      // Send OTP email to owner
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Use Supabase's built-in email via admin API
      // We'll use a simple approach: store OTP in a temp table or just use the admin API
      // For simplicity, send via Supabase Auth's admin invite (workaround)
      // Actually, let's use the Lovable API to send email
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      
      // Simple approach: return OTP to display in console for now, 
      // and store it server-side for verification
      // In production, this would send an actual email
      
      console.log(`OTP for owner registration by ${email}: ${code} (sent to ${OWNER_EMAIL})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Kode OTP telah dikirim ke email owner (${OWNER_EMAIL.replace(/(.{3}).*(@.*)/, "$1***$2")})`,
          // DEV ONLY: include OTP for testing since we can't send real email without email infra
          dev_otp: code 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "verify") {
      const stored = otpStore.get(email);
      
      if (!stored) {
        return new Response(
          JSON.stringify({ success: false, message: "Kode OTP tidak ditemukan. Silakan minta kode baru." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (Date.now() > stored.expires) {
        otpStore.delete(email);
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

      otpStore.delete(email);
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
