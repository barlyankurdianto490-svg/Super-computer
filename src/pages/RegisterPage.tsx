import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";

const roles = [
  { value: "admin", label: "Admin", icon: ShieldCheck, description: "Kelola pesanan, teknisi & laporan" },
  { value: "technician", label: "Teknisi", icon: Wrench, description: "Update progres & perbaikan unit" },
];

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("technician");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, requested_role: selectedRole },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda menunggu persetujuan. Silakan cek email untuk verifikasi.",
      });
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
              <img src={logoIcon} alt="Duper Computer" className="w-12 h-12" />
            </div>
            <CardTitle className="text-xl">Daftar Akun</CardTitle>
            <CardDescription>Registrasi memerlukan persetujuan Admin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pilih Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => {
                    const isSelected = selectedRole === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <role.icon className={`w-5 h-5 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                          {role.label}
                        </span>
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
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Daftar sebagai {selectedRole === "admin" ? "Admin" : "Teknisi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
