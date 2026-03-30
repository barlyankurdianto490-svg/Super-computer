import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Wrench, Package, AlertCircle, Phone, Mail, XCircle, PauseCircle, ShieldCheck, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ServiceStatus = "received" | "diagnosed" | "waiting_confirmation" | "pending" | "in_progress" | "completed" | "cancelled" | "closed";

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  received: { label: "Serahkan Unit", color: "bg-blue-100 text-blue-800", icon: Package },
  diagnosed: { label: "Diagnosa", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  waiting_confirmation: { label: "Menunggu Konfirmasi", color: "bg-purple-100 text-purple-800", icon: PauseCircle },
  pending: { label: "Pending", color: "bg-orange-100 text-orange-800", icon: Clock },
  in_progress: { label: "Perbaikan", color: "bg-cyan-100 text-cyan-800", icon: Wrench },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancel", color: "bg-red-100 text-red-800", icon: XCircle },
  closed: { label: "Close", color: "bg-muted text-muted-foreground", icon: ShieldCheck },
};

const statusOrder: ServiceStatus[] = ["received", "diagnosed", "waiting_confirmation", "pending", "in_progress", "completed", "closed"];

const serviceTypeLabels: Record<string, string> = {
  warranty: "Service Garansi",
  personal: "Service Pribadi",
  install_upgrade: "Install & Upgrade",
};

const TrackingPage = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase.from("service_orders").select("*").eq("ticket_number", ticketId || "").single();
      if (data) {
        setOrder(data);
        const { data: upd } = await supabase.from("service_updates").select("*").eq("order_id", data.id).order("created_at", { ascending: true });
        if (upd) setUpdates(upd);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [ticketId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const isCancelled = order?.status === "cancelled";
  const currentStatusIndex = order ? (isCancelled ? -1 : statusOrder.indexOf(order.status as ServiceStatus)) : -1;

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Kembali</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <Settings className="w-5 h-5 text-accent" />
            <span className="font-bold text-foreground">Duper Computer</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Status Servis</h1>
          <p className="text-muted-foreground mb-6">
            Tiket: <span className="font-mono font-semibold text-foreground">{ticketId}</span>
          </p>

          {!order ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Tiket Tidak Ditemukan</h3>
                <p className="text-sm text-muted-foreground mb-4">Nomor tiket "{ticketId}" belum terdaftar.</p>
                <Link to="/" className="text-sm text-accent hover:underline">Coba cari lagi</Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Status Timeline */}
              <Card className="mb-6 border-border">
                <CardHeader><CardTitle className="text-lg">Progres Perbaikan</CardTitle></CardHeader>
                <CardContent>
                  {isCancelled ? (
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <XCircle className="w-6 h-6 text-red-500" />
                      <p className="text-sm font-medium text-red-800">Pesanan ini telah dibatalkan</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {statusOrder.map((status, i) => {
                        const config = statusConfig[status];
                        const isActive = i <= currentStatusIndex;
                        const isCurrent = i === currentStatusIndex;
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCurrent ? config.color : isActive ? "bg-green-100" : "bg-muted"}`}>
                              <config.icon className={`w-4 h-4 ${isCurrent ? "" : isActive ? "text-green-600" : "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{config.label}</p>
                            </div>
                            {isCurrent && <Badge className={config.color}>Saat Ini</Badge>}
                            {isActive && !isCurrent && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Info */}
              <Card className="mb-6 border-border">
                <CardHeader><CardTitle className="text-lg">Detail Unit</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{order.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Perangkat</span><span className="font-medium">{order.device_type} {order.device_brand && `• ${order.device_brand}`} {order.device_model && `• ${order.device_model}`}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tipe Servis</span><span className="font-medium">{serviceTypeLabels[order.service_type] || order.service_type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Masuk</span><span className="font-medium">{new Date(order.created_at).toLocaleDateString("id-ID")}</span></div>
                  {order.final_cost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Total Biaya</span><span className="font-bold">Rp {order.final_cost.toLocaleString("id-ID")}</span></div>}
                </CardContent>
              </Card>

              {/* Updates */}
              {updates.length > 0 && (
                <Card className="border-border">
                  <CardHeader><CardTitle className="text-lg">Riwayat Update</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {updates.map((u: any) => {
                        const st = statusConfig[u.status as ServiceStatus];
                        return (
                          <div key={u.id} className="flex gap-3">
                            <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{st?.label || u.status}</Badge>
                                <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("id-ID")}</span>
                              </div>
                              {u.description && <p className="text-sm text-muted-foreground mt-1">{u.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Butuh bantuan?</p>
            <div className="flex items-center justify-center gap-4">
              <a href="tel:+62" className="flex items-center gap-1 text-sm text-accent hover:underline"><Phone className="w-4 h-4" /> Telepon</a>
              <a href="mailto:" className="flex items-center gap-1 text-sm text-accent hover:underline"><Mail className="w-4 h-4" /> Email</a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrackingPage;
