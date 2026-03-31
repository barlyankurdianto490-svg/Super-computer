import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Users, Wrench, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, { label: string; color: string }> = {
  received: { label: "Diterima", color: "bg-blue-100 text-blue-800" },
  diagnosed: { label: "Diagnosa", color: "bg-yellow-100 text-yellow-800" },
  waiting_confirmation: { label: "Menunggu Konfirmasi", color: "bg-purple-100 text-purple-800" },
  in_progress: { label: "Perbaikan", color: "bg-cyan-100 text-cyan-800" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800" },
  ready_for_pickup: { label: "Siap diAmbil", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancel", color: "bg-red-100 text-red-800" },
  closed: { label: "Close", color: "bg-muted text-muted-foreground" },
};

const DashboardHome = () => {
  const navigate = useNavigate();
  const [totalOrders, setTotalOrders] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completedMonth, setCompletedMonth] = useState(0);
  const [staleOrders, setStaleOrders] = useState(0);
  const [activeTechnicians, setActiveTechnicians] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Total orders
      const { count: total } = await supabase.from("service_orders").select("*", { count: "exact", head: true });
      setTotalOrders(total || 0);

      // In progress (not final)
      const { count: active } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("completed","closed","cancelled","ready_for_pickup")');
      setInProgress(active || 0);

      // Completed this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: completed } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", startOfMonth.toISOString());
      setCompletedMonth(completed || 0);

      // Stale orders (not updated in 24h, not final)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: stale } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("completed","closed","cancelled","ready_for_pickup")')
        .lt("updated_at", yesterday);
      setStaleOrders(stale || 0);

      // Active technicians
      const { count: techs } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true)
        .eq("requested_role", "technician" as any);
      setActiveTechnicians(techs || 0);

      // Recent orders
      const { data: orders } = await supabase
        .from("service_orders")
        .select("id, ticket_number, customer_name, device_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentOrders(orders || []);

      // Recent updates
      const { data: updates } = await supabase
        .from("service_updates")
        .select("id, order_id, status, description, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentUpdates(updates || []);

      setLoading(false);
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Total Pesanan", value: totalOrders.toString(), icon: ClipboardList, trend: "Semua waktu" },
    { label: "Dalam Proses", value: inProgress.toString(), icon: Wrench, trend: "Aktif" },
    { label: "Selesai", value: completedMonth.toString(), icon: TrendingUp, trend: "Bulan ini" },
    { label: "Belum Update 24j", value: staleOrders.toString(), icon: AlertTriangle, trend: "Perlu perhatian" },
    { label: "Teknisi Aktif", value: activeTechnicians.toString(), icon: Users, trend: "Terakreditasi" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan aktivitas servis.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-5 h-5 text-accent" />
                  <span className="text-xs text-muted-foreground">{stat.trend}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Pesanan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Memuat...</p>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Belum ada pesanan servis.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => {
                  const s = statusLabels[o.status] || { label: o.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/orders/${o.id}`)}
                    >
                      <div>
                        <p className="text-sm font-mono font-bold text-foreground">{o.ticket_number}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_name} • {o.device_type}</p>
                      </div>
                      <Badge className={s.color + " text-xs"}>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-4 h-4" /> Update Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Memuat...</p>
            ) : recentUpdates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada update.</p>
            ) : (
              <div className="space-y-2">
                {recentUpdates.map((u) => {
                  const s = statusLabels[u.status] || { label: u.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={u.id} className="flex gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{s.label}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("id-ID")}</span>
                        </div>
                        {u.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
