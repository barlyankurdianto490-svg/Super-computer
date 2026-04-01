import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Phone, Copy, ExternalLink, FileText, ChevronRight, Mail, Camera, Pencil, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusFlow = [
  { value: "received", label: "Diterima", color: "bg-blue-100 text-blue-800" },
  { value: "diagnosed", label: "Diagnosa", color: "bg-yellow-100 text-yellow-800" },
  { value: "waiting_confirmation", label: "Menunggu Konfirmasi", color: "bg-purple-100 text-purple-800" },
  { value: "in_progress", label: "Perbaikan", color: "bg-cyan-100 text-cyan-800" },
  { value: "completed", label: "Selesai", color: "bg-green-100 text-green-800" },
  { value: "ready_for_pickup", label: "Siap diAmbil", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Cancel", color: "bg-red-100 text-red-800" },
  { value: "closed", label: "Close", color: "bg-muted text-muted-foreground" },
];

// Legacy status mapping for old data
const legacyStatusLabels: Record<string, string> = {
  pending: "Menunggu",
  diagnose: "Diagnosa",
};

const serviceTypeLabels: Record<string, string> = {
  non_warranty: "Non Garansi",
  warranty_store: "Garansi Toko",
  warranty_partner: "Garansi Partner",
  install: "Install",
};

const checkLabels: Record<string, string> = {
  speaker: "Speaker", camera: "Camera", touchpad: "Touchpad", keyboard: "Keyboard", wifi: "Wifi",
};

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateDesc, setUpdateDesc] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([{ description: "", amount: "" }]);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelType, setCancelType] = useState("Cancel by Customer");
  const [cancelReason, setCancelReason] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ service_type: "", customer_name: "", customer_phone: "", customer_email: "", device_type: "", device_brand: "", device_model: "", device_password: "" });

  const fetchOrder = async () => {
    if (!orderId) return;
    const { data } = await supabase.from("service_orders").select("*").eq("id", orderId).single();
    if (data) setOrder(data);

    const { data: upd } = await supabase.from("service_updates").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    if (upd) setUpdates(upd);

    const { data: ph } = await supabase.from("service_photos").select("*").eq("order_id", orderId);
    if (ph) setPhotos(ph);

    setLoading(false);
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  const getNextStatus = () => {
    if (!order) return null;
    const mainFlow = statusFlow.filter(s => !["cancelled", "closed"].includes(s.value));
    const idx = mainFlow.findIndex(s => s.value === order.status);
    if (idx === -1 || idx >= mainFlow.length - 1) return null;
    return mainFlow[idx + 1];
  };

  const handleNextStatus = async () => {
    const next = getNextStatus();
    if (!next || !order || !updateDesc.trim()) {
      toast({ title: "Keterangan wajib diisi", variant: "destructive" });
      return;
    }
    setUpdating(true);
    try {
      await supabase.from("service_orders").update({ status: next.value, updated_at: new Date().toISOString() } as any).eq("id", order.id);
      await supabase.from("service_updates").insert({ order_id: order.id, status: next.value, description: updateDesc, updated_by: user?.id });
      setUpdateDesc("");
      toast({ title: "Status Diperbarui", description: `→ ${next.label}` });
      fetchOrder();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast({ title: "Alasan wajib diisi", variant: "destructive" }); return; }
    setUpdating(true);
    try {
      await supabase.from("service_orders").update({ status: "cancelled", updated_at: new Date().toISOString() } as any).eq("id", order.id);
      await supabase.from("service_updates").insert({
        order_id: order.id,
        status: "cancelled",
        description: cancelReason,
        updated_by: user?.id,
        cancel_type: cancelType,
      } as any);
      toast({ title: "Pesanan Dibatalkan" });
      setShowCancel(false);
      setCancelReason("");
      fetchOrder();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleCreateInvoice = async () => {
    const total = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    try {
      await supabase.from("service_orders").update({ final_cost: total, status: "ready_for_pickup", updated_at: new Date().toISOString() } as any).eq("id", order.id);
      await supabase.from("service_updates").insert({
        order_id: order.id, status: "ready_for_pickup",
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

  const handleOpenEdit = () => {
    if (!order) return;
    setEditForm({
      service_type: order.service_type,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || "",
      device_type: order.device_type,
      device_brand: order.device_brand || "",
      device_model: order.device_model || "",
      device_password: order.device_password || "",
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    try {
      const editedByText = `Diedit oleh ${profile?.full_name || user?.email}`;
      await supabase.from("service_orders").update({
        service_type: editForm.service_type,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email || null,
        device_type: editForm.device_type,
        device_brand: editForm.device_brand,
        device_model: editForm.device_model || null,
        device_password: editForm.device_password || null,
        edited_by: editedByText,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq("id", order.id);
      toast({ title: "Data Diperbarui" });
      setShowEdit(false);
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
    const msg = encodeURIComponent(`Halo ${order.customer_name}, pesanan servis Anda:\n\nTiket: ${order.ticket_number}\nStatus: ${statusFlow.find(s => s.value === order.status)?.label}\nLacak: ${link}\n\n- Super Computer`);
    const cleanPhone = order.customer_phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-12 text-muted-foreground">Pesanan tidak ditemukan</div>;

  const currentStatus = statusFlow.find(s => s.value === order.status) || statusFlow[0];
  const isAdmin = userRole === "admin" || userRole === "owner";
  const canUpdate = isAdmin || userRole === "technician";
  const nextStatus = getNextStatus();
  const isFinal = ["closed", "cancelled"].includes(order.status);
  const canCancel = !["completed", "ready_for_pickup", "closed", "cancelled"].includes(order.status);
  const unitChecks = order.unit_checks as Record<string, boolean> | null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/orders")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{order.ticket_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
            <Badge variant="outline">{serviceTypeLabels[order.service_type] || order.service_type}</Badge>
          </div>
          {order.edited_by && (
            <p className="text-xs text-muted-foreground mt-1">
              ✏️ {order.edited_by}, waktu {new Date(order.edited_at).toLocaleString("id-ID")}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && !isFinal && (
            <Button variant="outline" size="sm" onClick={handleOpenEdit}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
          )}
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
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Info Pelanggan & Unit</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{order.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telepon</span><span className="font-medium flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span></div>
              {order.customer_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium flex items-center gap-1"><Mail className="w-3 h-3" />{order.customer_email}</span></div>}
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Perangkat</span><span className="font-medium">{order.device_type}</span></div>
              {order.device_brand && <div className="flex justify-between"><span className="text-muted-foreground">Merk</span><span className="font-medium">{order.device_brand}</span></div>}
              {order.device_model && <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{order.device_model}</span></div>}
              {order.device_password && <div className="flex justify-between"><span className="text-muted-foreground">Password</span><span className="font-medium font-mono">••••••</span></div>}
              <Separator />
              {order.unit_condition && <div className="flex justify-between"><span className="text-muted-foreground">Kondisi</span><span className="font-medium">{order.unit_condition}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Keluhan</span><span className="font-medium text-right max-w-[60%]">{order.damage_description}</span></div>
              {order.unit_accessories && <div className="flex justify-between"><span className="text-muted-foreground">Kelengkapan</span><span className="font-medium">{order.unit_accessories}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Tipe Servis</span><span className="font-medium">{serviceTypeLabels[order.service_type] || order.service_type}</span></div>
              {order.final_cost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Biaya Akhir</span><span className="font-bold text-foreground">Rp {order.final_cost.toLocaleString("id-ID")}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Tanggal</span><span className="font-medium">{new Date(order.created_at).toLocaleDateString("id-ID")}</span></div>
              {order.notes && <><Separator /><p className="text-muted-foreground text-xs">{order.notes}</p></>}
            </CardContent>
          </Card>

          {unitChecks && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Cek Unit</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(unitChecks).map(([key, val]) => (
                    <Badge key={key} variant="outline" className={`text-xs ${val ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {checkLabels[key] || key}: {val ? "OK" : "NG"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {photos.length > 0 && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Foto Unit</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((p: any) => (
                    <div key={p.id} className="text-center">
                      <img src={p.photo_url} alt={p.label} className="w-full h-24 object-cover rounded border border-border" />
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{p.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canUpdate && !isFinal && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
                {nextStatus && <p className="text-xs text-muted-foreground">Tahap berikutnya: <span className="font-semibold text-foreground">{nextStatus.label}</span></p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="Tulis keterangan update (wajib)..." value={updateDesc} onChange={e => setUpdateDesc(e.target.value)} className="text-sm" />
                <div className="flex gap-2">
                  {nextStatus && (
                    <Button onClick={handleNextStatus} disabled={updating} className="flex-1">
                      {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      Next → {nextStatus.label}
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)} disabled={updating}>Cancel</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Riwayat Update</CardTitle></CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada update</p>
              ) : (
                <div className="space-y-3">
                  {updates.map((u: any) => {
                    const st = statusFlow.find(s => s.value === u.status);
                    const statusLabel = st?.label || legacyStatusLabels[u.status] || u.status;
                    return (
                      <div key={u.id} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                            {u.cancel_type && <Badge variant="outline" className="text-xs text-red-600 border-red-200">{u.cancel_type}</Badge>}
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

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Batalkan Pesanan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Pembatalan</label>
              <div className="grid grid-cols-2 gap-2">
                {["Cancel by Customer", "Cancel by Super Komputer"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCancelType(t)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${cancelType === t ? "border-red-400 bg-red-50 text-red-700" : "border-border text-muted-foreground hover:border-red-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Alasan Pembatalan *</label>
              <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Jelaskan alasan pembatalan..." />
            </div>
            <Button variant="destructive" onClick={handleCancel} disabled={updating || !cancelReason.trim()} className="w-full">
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XIcon className="w-4 h-4 mr-1" />}
              Konfirmasi Pembatalan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Data Pesanan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tipe Servis</label>
              <select value={editForm.service_type} onChange={e => setEditForm(f => ({ ...f, service_type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="non_warranty">Non Garansi</option>
                <option value="warranty_store">Garansi Toko</option>
                <option value="warranty_partner">Garansi Partner</option>
                <option value="install">Install</option>
              </select>
            </div>
            <div><label className="text-sm font-medium">Nama Pelanggan</label><Input value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">No. HP</label><Input value={editForm.customer_phone} onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Email</label><Input value={editForm.customer_email} onChange={e => setEditForm(f => ({ ...f, customer_email: e.target.value }))} /></div>
            <Separator />
            <div><label className="text-sm font-medium">Jenis Perangkat</label><Input value={editForm.device_type} onChange={e => setEditForm(f => ({ ...f, device_type: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Merk</label><Input value={editForm.device_brand} onChange={e => setEditForm(f => ({ ...f, device_brand: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Model</label><Input value={editForm.device_model} onChange={e => setEditForm(f => ({ ...f, device_model: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Password</label><Input value={editForm.device_password} onChange={e => setEditForm(f => ({ ...f, device_password: e.target.value }))} /></div>
            <Button onClick={handleSaveEdit} className="w-full bg-accent text-accent-foreground">Simpan Perubahan</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                {invoiceItems.length > 1 && <Button variant="ghost" size="sm" onClick={() => setInvoiceItems(invoiceItems.filter((_, j) => j !== i))}>×</Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setInvoiceItems([...invoiceItems, { description: "", amount: "" }])}>+ Tambah Item</Button>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>Rp {invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString("id-ID")}</span>
            </div>
            <Button onClick={handleCreateInvoice} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Simpan Invoice → Siap diAmbil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;
