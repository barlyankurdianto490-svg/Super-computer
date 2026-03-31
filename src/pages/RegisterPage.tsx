import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2, ShieldCheck, Wrench, Crown, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";

const roles = [
  { value: "owner", label: "Owner", icon: Crown, description: "Kontrol penuh atas sistem" },
  { value: "admin", label: "Admin", icon: ShieldCheck, description: "Kelola pesanan & laporan" },
  { value: "technician", label: "Teknisi", icon: Wrench, description: "Update progres perbaikan" },
];

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("technician");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast({ title: "Email wajib diisi", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-owner-otp", {
        body: { action: "send", email },
      });
      if (error) throw error;
      setOtpStep(true);
      if (data?.dev_otp) setDevOtp(data.dev_otp);
      toast({ title: "OTP Terkirim", description: data?.message || "Cek email owner untuk kode OTP." });
    } catch (error: any) {
      toast({ title: "Gagal Kirim OTP", description: error.message, variant: "destructive" });
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-owner-otp", {
        body: { action: "verify", email, otp: otpCode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || "Verifikasi gagal");
      setOtpVerified(true);
      toast({ title: "OTP Terverifikasi", description: "Silakan lanjutkan pendaftaran." });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
    setOtpSending(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "owner" && !otpVerified) {
      toast({ title: "Verifikasi OTP diperlukan", description: "Silakan verifikasi kode OTP terlebih dahulu.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, requested_role: selectedRole },
        },
      });
      if (error) throw error;

      if (selectedRole === "owner") {
        toast({
          title: "Pendaftaran Owner Berhasil",
          description: "Akun Owner Anda langsung aktif. Silakan login.",
        });
      } else if (selectedRole === "admin") {
        toast({
          title: "Pendaftaran Admin Berhasil",
          description: "Akun Admin Anda menunggu persetujuan Owner.",
        });
      } else {
        toast({
          title: "Pendaftaran Berhasil",
          description: "Akun Teknisi Anda menunggu persetujuan Owner.",
        });
      }
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Pendaftaran Gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Login
        </Link>

        <Card className="border-border shadow-elevated">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <img src={logoIcon} alt="Super Computer" className="w-12 h-12" />
            </div>
            <CardTitle className="text-xl">Daftar Akun</CardTitle>
            <CardDescription>Owner langsung aktif • Admin & Teknisi perlu persetujuan Owner</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pilih Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => {
                    const isSelected = selectedRole === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => { setSelectedRole(role.value); setOtpStep(false); setOtpVerified(false); setOtpCode(""); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                          isSelected ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <role.icon className={`w-5 h-5 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{role.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{role.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Nama Lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Password (min 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>

              {/* OTP Section for Owner */}
              {selectedRole === "owner" && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <KeyRound className="w-3 h-3 inline mr-1" />
                    Pendaftaran Owner memerlukan verifikasi kode OTP yang dikirim ke email owner terdaftar.
                  </p>
                  {!otpStep ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleSendOtp} disabled={otpSending} className="w-full">
                      {otpSending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Kirim Kode OTP
                    </Button>
                  ) : !otpVerified ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Masukkan 6-digit kode OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                      />
                      {devOtp && <p className="text-xs text-muted-foreground text-center">Dev OTP: <span className="font-mono font-bold">{devOtp}</span></p>}
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleSendOtp} disabled={otpSending} className="flex-1">
                          Kirim Ulang
                        </Button>
                        <Button type="button" size="sm" onClick={handleVerifyOtp} disabled={otpSending || otpCode.length < 6} className="flex-1 bg-accent text-accent-foreground">
                          {otpSending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Verifikasi
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 font-medium text-center">✓ OTP Terverifikasi</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading || (selectedRole === "owner" && !otpVerified)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Daftar sebagai {roles.find(r => r.value === selectedRole)?.label}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
