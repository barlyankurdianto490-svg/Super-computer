import { useState, useEffect } from "react";
import { Users, CheckCircle, XCircle, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TechniciansPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: true } as any)
        .eq("id", userId);
      if (profileError) throw profileError;

      // Add role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role } as any);
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      toast({ title: "Akun Disetujui", description: `Pengguna telah diaktifkan sebagai ${role}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: false } as any)
        .eq("id", userId);
      if (error) throw error;

      // Remove role if exists
      await supabase.from("user_roles").delete().eq("user_id", userId);

      toast({ title: "Akun Ditolak", description: "Akses pengguna telah dicabut." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kelola Pengguna</h1>
        <p className="text-muted-foreground">Setujui atau tolak pendaftaran admin & teknisi.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <Card className="border-border shadow-card">
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Belum Ada Pengguna Terdaftar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u: any) => (
            <Card key={u.id} className="border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {u.requested_role === "admin" ? <ShieldCheck className="w-5 h-5 text-accent" /> : <Wrench className="w-5 h-5 text-accent" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.full_name || "Tanpa Nama"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{u.requested_role}</Badge>
                        {u.is_approved ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Menunggu</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!u.is_approved ? (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u.id, u.requested_role)}
                        disabled={actionLoading === u.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Setujui
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(u.id)}
                        disabled={actionLoading === u.id}
                      >
                        {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                        Cabut Akses
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechniciansPage;
