import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Phone, Copy, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusFlow = [
  { value: "received", label: "Serahkan Unit", color: "bg-blue-100 text-blue-800" },
  { value: "diagnosed", label: "Diagnosa", color: "bg-yellow-100 text-yellow-800" },
  { value: "waiting_confirmation", label: "Menunggu Konfirmasi", color: "bg-purple-100 text-purple-800" },
  { value: "pending", label: "Pending", color: "bg-orange-100 text-orange-800" },
  { value: "in_progress", label: "Perbaikan", color: "bg-cyan-100 text-cyan-800" },
  { value: "completed", label: "Selesai", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancel", color: "bg-red-100 text-red-800" },
  { value: "closed", label: "Close", color: "bg-muted text-muted-foreground" },
];

const serviceTypeLabels: Record<string, string> = {
  warranty: "Service Garansi",
  personal: "Service Pribadi",
  install_upgrade: "Install & Upgrade",
};

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateDesc, setUpdateDesc] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([{ description: "", amount: "" }]);

  const fetchOrder = async () => {
    if (!orderId) return;
    const { data } = await supabase.from("service_orders").select("*").eq("id", orderId).single();
    if (data) setOrder(data);

    const { data: upd } = await supabase
      .from("service_updates")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (upd) setUpdates(upd);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await supabase.from("service_orders").update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", order.id);
      await supabase.from("service_updates").insert({
        order_id: order.id,
        status: newStatus,
        description: updateDesc || `Status diubah ke ${statusFlow.find(s => s.value === newStatus)?.label}`,
        updated_by: user?.id,
      });
      setUpdateDesc("");
      toast({ title: "Status Diperbarui" });
      fetchOrder();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleCreateInvoice = async () => {
    const total = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    try {
      await supabase.from("service_orders").update({ final_cost: total, status: "closed", updated_at: new Date().toISOString() } as any).eq("id", order.id);
      await supabase.from("service_updates").insert({
        order_id: order.id,
        status: "closed",
        description: `Invoice dibuat. Total: Rp ${total.toLocaleString("id-ID")}. Detail: ${invoiceItems.map(i => `${i.description}: Rp ${parseFloat(i.amount || "0").toLocaleString("id-ID")}`).join(", ")}`,
        updated_by: user?.id,
      });
      toast({ title: "Invoice Dibuat", description: `Total: Rp ${total.toLocaleString("id-ID")}` });
      setShowInvoice(false);
      fetchOrder();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
  };

  const copyTrackingLink = () => {
    if (!order) return;
    navigator.clipboard.writeText(`${window.location.origin}/track/${order.ticket_number}`);
    toast({ title: "Link Disalin" });
  };

  const sendWhatsApp = () => {
    if (!order) return;
    const link = `${window.location.origin}/track/${order.ticket_number}`;
    const msg = encodeURIComponent(`Halo ${order.customer_name}, pesanan servis Anda:\n\nTiket: ${order.ticket_number}\nStatus: ${statusFlow.find(s => s.value === order.status)?.label}\nLacak: ${link}\n\n- Duper Computer`);
    const cleanPhone = order.customer_phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-12 text-muted-foreground">Pesanan tidak ditemukan</div>;

  const currentStatus = statusFlow.find(s => s.value === order.status) || statusFlow[0];
  const isAdmin = userRole === "admin";
  const isTechnician = userRole === "technician";
  const canUpdate = isAdmin || isTechnician;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/orders")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{order.ticket_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
            <Badge variant="outline">{serviceTypeLabels[order.service_type] || order.service_type}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyTrackingLink}><Copy className="w-3 h-3 mr-1" /> Link</Button>
          <Button variant="outline" size="sm" onClick={sendWhatsApp}><ExternalLink className="w-3 h-3 mr-1" /> WA</Button>
          {isAdmin && order.status === "completed" && (
            <Button size="sm" onClick={() => setShowInvoice(true)} className="bg-accent text-accent-foreground">
              <FileText className="w-3 h-3 mr-1" /> Buat Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer & Device Info */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Info Pelanggan & Unit</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{order.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Telepon</span><span className="font-medium flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Perangkat</span><span className="font-medium">{order.device_type}</span></div>
            {order.device_brand && <div className="flex justify-between"><span className="text-muted-foreground">Merek</span><span className="font-medium">{order.device_brand}</span></div>}
            {order.device_model && <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{order.device_model}</span></div>}
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Kerusakan</span><span className="font-medium text-right max-w-[60%]">{order.damage_description}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipe Servis</span><span className="font-medium">{serviceTypeLabels[order.service_type] || order.service_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Est. Biaya</span><span className="font-medium">Rp {(order.estimated_cost || 0).toLocaleString("id-ID")}</span></div>
            {order.final_cost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Biaya Akhir</span><span className="font-bold text-foreground">Rp {order.final_cost.toLocaleString("id-ID")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal</span><span className="font-medium">{new Date(order.created_at).toLocaleDateString("id-ID")}</span></div>
            {order.notes && <><Separator /><p className="text-muted-foreground text-xs">{order.notes}</p></>}
          </CardContent>
        </Card>

        {/* Status Update */}
        <div className="space-y-4">
          {canUpdate && !["closed", "cancelled"].includes(order.status) && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select onValueChange={handleStatusUpdate} disabled={updating}>
                  <SelectTrigger><SelectValue placeholder="Pilih status baru..." /></SelectTrigger>
                  <SelectContent>
                    {statusFlow.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Keterangan update (opsional)..." value={updateDesc} onChange={e => setUpdateDesc(e.target.value)} className="text-sm" />
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Riwayat Update</CardTitle></CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada update</p>
              ) : (
                <div className="space-y-3">
                  {updates.map((u: any) => {
                    const st = statusFlow.find(s => s.value === u.status);
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Invoice - {order.ticket_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>{order.customer_name} • {order.customer_phone}</p>
              <p>{order.device_type} {order.device_brand && `• ${order.device_brand}`}</p>
            </div>
            <Separator />
            <p className="text-sm font-medium">Item Biaya</p>
            {invoiceItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Deskripsi" value={item.description} onChange={e => { const items = [...invoiceItems]; items[i].description = e.target.value; setInvoiceItems(items); }} className="flex-1" />
                <Input type="number" placeholder="Rp" value={item.amount} onChange={e => { const items = [...invoiceItems]; items[i].amount = e.target.value; setInvoiceItems(items); }} className="w-32" />
                {invoiceItems.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setInvoiceItems(invoiceItems.filter((_, j) => j !== i))}>×</Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setInvoiceItems([...invoiceItems, { description: "", amount: "" }])}>+ Tambah Item</Button>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rp {invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString("id-ID")}</span>
            </div>
            <Button onClick={handleCreateInvoice} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Simpan Invoice & Tutup Pesanan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;
