import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Wrench, Package, AlertCircle, Phone, Mail, XCircle, PauseCircle, ShieldCheck, Camera, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";

type ServiceStatus = "received" | "diagnosed" | "waiting_confirmation" | "in_progress" | "completed" | "ready_for_pickup" | "cancelled" | "closed";

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  received: { label: "Diterima", color: "bg-blue-100 text-blue-800", icon: Package },
  diagnosed: { label: "Diagnosa", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  waiting_confirmation: { label: "Menunggu Konfirmasi", color: "bg-purple-100 text-purple-800", icon: PauseCircle },
  in_progress: { label: "Perbaikan", color: "bg-cyan-100 text-cyan-800", icon: Wrench },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  ready_for_pickup: { label: "Siap diAmbil", color: "bg-emerald-100 text-emerald-800", icon: Truck },
  cancelled: { label: "Cancel", color: "bg-red-100 text-red-800", icon: XCircle },
  closed: { label: "Close", color: "bg-muted text-muted-foreground", icon: ShieldCheck },
};

const statusOrder: ServiceStatus[] = ["received", "diagnosed", "waiting_confirmation", "in_progress", "completed", "ready_for_pickup", "closed"];

const serviceTypeLabels: Record<string, string> = {
  non_warranty: "Non Garansi",
  warranty_store: "Garansi Toko",
  warranty_partner: "Garansi Partner",
  install: "Install",
};

const TrackingPage = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase.from("service_orders").select("*").eq("ticket_number", ticketId || "").single();
      if (data) {
        setOrder(data);
        const { data: upd } = await supabase.from("service_updates").select("*").eq("order_id", data.id).order("created_at", { ascending: true });
        if (upd) setUpdates(upd);
        const { data: ph } = await supabase.from("service_photos").select("*").eq("order_id", data.id);
        if (ph) setPhotos(ph);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [ticketId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const isCancelled = order?.status === "cancelled";
  const currentStatusIndex = order ? (isCancelled ? -1 : statusOrder.indexOf(order.status as ServiceStatus)) : -1;

  const statusUpdateMap: Record<string, { description: string; date: string; cancel_type?: string }> = {};
  updates.forEach(u => {
    if (!statusUpdateMap[u.status]) {
      statusUpdateMap[u.status] = { description: u.description || "", date: new Date(u.created_at).toLocaleString("id-ID"), cancel_type: u.cancel_type };
    }
  });

  const unitChecks = order?.unit_checks as Record<string, boolean> | null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Kembali</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <img src={logoIcon} alt="Super Computer" className="w-6 h-6" />
            <span className="font-bold text-foreground">Super Computer</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Status Servis</h1>
          <p className="text-muted-foreground mb-6">Tiket: <span className="font-mono font-semibold text-foreground">{ticketId}</span></p>

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
              <Card className="mb-6 border-border">
                <CardHeader><CardTitle className="text-lg">Progres Perbaikan</CardTitle></CardHeader>
                <CardContent>
                  {isCancelled ? (
                    <div className="space-y-4">
                      {updates.filter(u => u.status !== "cancelled").map((u, i) => {
                        const st = statusConfig[u.status as ServiceStatus];
                        return (
                          <div key={u.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100">
                                {st && <st.icon className="w-4 h-4 text-green-600" />}
                              </div>
                              {i < updates.filter(u2 => u2.status !== "cancelled").length - 1 && <div className="w-0.5 flex-1 bg-green-200 my-1" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="text-sm font-medium text-foreground">{st?.label || u.status}</p>
                              <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("id-ID")}</span>
                              {u.description && <p className="text-sm text-muted-foreground mt-1">{u.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Pesanan Dibatalkan</p>
                          {statusUpdateMap["cancelled"] && (
                            <>
                              {statusUpdateMap["cancelled"].cancel_type && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-200 mb-1">{statusUpdateMap["cancelled"].cancel_type}</Badge>
                              )}
                              <span className="text-xs text-red-600 block">{statusUpdateMap["cancelled"].date}</span>
                              <p className="text-sm text-red-700 mt-1">{statusUpdateMap["cancelled"].description}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {statusOrder.map((status, i) => {
                        const config = statusConfig[status];
                        const isActive = i <= currentStatusIndex;
                        const isCurrent = i === currentStatusIndex;
                        const updateInfo = statusUpdateMap[status];
                        const isLast = i === statusOrder.length - 1;
                        return (
                          <div key={status} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isCurrent ? config.color : isActive ? "bg-green-100" : "bg-muted"}`}>
                                <config.icon className={`w-4 h-4 ${isCurrent ? "" : isActive ? "text-green-600" : "text-muted-foreground"}`} />
                              </div>
                              {!isLast && <div className={`w-0.5 flex-1 min-h-[16px] my-1 ${isActive && !isCurrent ? "bg-green-200" : "bg-border"}`} />}
                            </div>
                            <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{config.label}</p>
                                {isCurrent && <Badge className={config.color + " text-xs"}>Saat Ini</Badge>}
                                {isActive && !isCurrent && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              </div>
                              {isActive && updateInfo && (
                                <div className="mt-1">
                                  <span className="text-xs text-muted-foreground">{updateInfo.date}</span>
                                  {updateInfo.description && <p className="text-sm text-muted-foreground mt-0.5">{updateInfo.description}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mb-6 border-border">
                <CardHeader><CardTitle className="text-lg">Detail Unit</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{order.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Perangkat</span><span className="font-medium">{order.device_type} {order.device_brand && `• ${order.device_brand}`} {order.device_model && `• ${order.device_model}`}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tipe Servis</span><span className="font-medium">{serviceTypeLabels[order.service_type] || order.service_type}</span></div>
                  {order.unit_condition && <div className="flex justify-between"><span className="text-muted-foreground">Kondisi</span><span className="font-medium">{order.unit_condition}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Masuk</span><span className="font-medium">{new Date(order.created_at).toLocaleDateString("id-ID")}</span></div>
                  {order.final_cost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Total Biaya</span><span className="font-bold">Rp {order.final_cost.toLocaleString("id-ID")}</span></div>}
                </CardContent>
              </Card>

              {unitChecks && (
                <Card className="mb-6 border-border">
                  <CardHeader><CardTitle className="text-lg">Hasil Cek Unit</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(unitChecks).map(([key, val]) => (
                        <Badge key={key} variant="outline" className={`text-xs ${val ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}: {val ? "OK" : "NG"}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {photos.length > 0 && (
                <Card className="mb-6 border-border">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="w-4 h-4" /> Foto Unit</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((p: any) => (
                        <div key={p.id} className="text-center">
                          <img src={p.photo_url} alt={p.label} className="w-full h-32 object-cover rounded border border-border" />
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{p.label}</p>
                        </div>
                      ))}
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
