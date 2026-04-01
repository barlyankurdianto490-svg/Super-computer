import { useState, useEffect } from "react";
import { ClipboardList, Plus, Loader2, Phone, Search, ExternalLink, Copy, Eye, CheckSquare, Square, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const serviceTypeLabels: Record<string, string> = {
  non_warranty: "Non Garansi",
  warranty_store: "Garansi Toko",
  warranty_partner: "Garansi Partner",
  install: "Install",
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState(false);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const isAdmin = userRole === "admin" || userRole === "owner";
  const isTechnician = userRole === "technician";

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const copyTrackingLink = (ticketNumber: string) => {
    const link = `${window.location.origin}/track/${ticketNumber}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Disalin", description: "Link tracking berhasil disalin ke clipboard." });
  };

  const sendWhatsApp = (phone: string, ticketNumber: string) => {
    const link = `${window.location.origin}/track/${ticketNumber}`;
    const msg = encodeURIComponent(`Halo, pesanan servis Anda telah dibuat.\n\nNomor Tiket: ${ticketNumber}\nLacak di: ${link}\n\n- Super Computer`);
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClaim = async () => {
    if (selectedIds.size === 0 || !user) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_tickets", {
        _ticket_ids: Array.from(selectedIds),
        _technician_id: user.id,
      });
      if (error) throw error;
      toast({ title: "Tiket Diklaim", description: `${data} tiket berhasil diklaim.` });
      setSelectedIds(new Set());
      fetchOrders();
    } catch (e: any) {
      toast({ title: "Gagal mengklaim", description: e.message, variant: "destructive" });
    }
    setClaiming(false);
  };

  const filterByQuery = (list: any[]) => {
    const q = searchQuery.toLowerCase();
    if (!q) return list;
    return list.filter((o) =>
      o.ticket_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q)
    );
  };

  // Technician pools
  const openTickets = orders.filter(o => o.status === "received" && !o.assigned_technician);
  const myTickets = orders.filter(o => o.assigned_technician === user?.id);

  const renderOrderCard = (order: any, options?: { selectable?: boolean }) => {
    const s = statusLabels[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
    const isSelected = selectedIds.has(order.id);

    return (
      <Card key={order.id} className={`border-border shadow-card transition-colors ${isSelected ? "ring-2 ring-accent" : ""}`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex gap-3 flex-1">
              {options?.selectable && (
                <button onClick={() => toggleSelect(order.id)} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  {isSelected ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5" />}
                </button>
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground font-mono">{order.ticket_number}</span>
                  <Badge className={s.color}>{s.label}</Badge>
                  <Badge variant="outline" className="text-xs">{serviceTypeLabels[order.service_type] || order.service_type}</Badge>
                </div>
                <p className="text-sm text-foreground font-medium">{order.customer_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {order.customer_phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.device_type} {order.device_brand && `• ${order.device_brand}`} {order.device_model && `• ${order.device_model}`}
                </p>
              </div>
            </div>
            <div className="flex sm:flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                <Eye className="w-3 h-3 mr-1" /> Detail
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => copyTrackingLink(order.ticket_number)}>
                    <Copy className="w-3 h-3 mr-1" /> Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => sendWhatsApp(order.customer_phone, order.ticket_number)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> WA
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <Card className="border-border shadow-card">
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{message}</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderOrderList = (list: any[], options?: { selectable?: boolean }) => {
    const filtered = filterByQuery(list);
    if (filtered.length === 0) return renderEmptyState("Tidak ada tiket ditemukan.");
    return (
      <div className="space-y-3">
        {filtered.map(order => renderOrderCard(order, options))}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  // TECHNICIAN VIEW
  if (isTechnician) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pesanan Servis</h1>
          <p className="text-muted-foreground">Ambil dan kelola tiket servis Anda.</p>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari tiket, nama, atau no HP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="open">
              Tiket Terbuka
              {openTickets.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{openTickets.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine">
              Tiket Dikerjakan
              {myTickets.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{myTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <UserCheck className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-foreground">{selectedIds.size} tiket dipilih</span>
                <Button size="sm" onClick={handleClaim} disabled={claiming} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserCheck className="w-4 h-4 mr-1" />}
                  Ambil Tiket
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Batal</Button>
              </div>
            )}
            {openTickets.length === 0
              ? renderEmptyState("Tidak ada tiket terbuka saat ini.")
              : renderOrderList(openTickets, { selectable: true })}
          </TabsContent>

          <TabsContent value="mine">
            {myTickets.length === 0
              ? renderEmptyState("Anda belum mengambil tiket apapun.")
              : renderOrderList(myTickets)}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ADMIN / OWNER VIEW
  const filteredOrders = filterByQuery(orders);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pesanan Servis</h1>
          <p className="text-muted-foreground">Kelola semua pesanan servis masuk.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/dashboard/orders/create")} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Buat Pesanan
          </Button>
        )}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari tiket, nama, atau no HP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {filteredOrders.length === 0 ? (
        renderEmptyState("Belum Ada Pesanan")
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => renderOrderCard(order))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
