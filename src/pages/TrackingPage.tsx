import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Wrench, Package, AlertCircle, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoIcon from "@/assets/logo-icon.png";

type ServiceStatus = "received" | "diagnosing" | "repairing" | "testing" | "completed" | "picked_up";

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  received: { label: "Diterima", color: "bg-info text-info-foreground", icon: Package },
  diagnosing: { label: "Diagnosa", color: "bg-warning text-warning-foreground", icon: AlertCircle },
  repairing: { label: "Perbaikan", color: "bg-accent text-accent-foreground", icon: Wrench },
  testing: { label: "Pengujian", color: "bg-info text-info-foreground", icon: Clock },
  completed: { label: "Selesai", color: "bg-success text-success-foreground", icon: CheckCircle2 },
  picked_up: { label: "Diambil", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

const statusOrder: ServiceStatus[] = ["received", "diagnosing", "repairing", "testing", "completed", "picked_up"];

const TrackingPage = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [notFound] = useState(true); // Will be replaced with real data

  // Demo data - will be replaced with real Supabase query
  const demoOrder = {
    ticket_number: ticketId,
    customer_name: "—",
    device: "—",
    status: "received" as ServiceStatus,
    created_at: new Date().toISOString(),
  };

  const currentStatusIndex = statusOrder.indexOf(demoOrder.status);

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Kembali</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <img src={logoIcon} alt="Duper Computer" className="w-7 h-7" />
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

          {notFound ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Tiket Tidak Ditemukan</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Nomor tiket "{ticketId}" belum terdaftar di sistem kami.
                </p>
                <Link to="/" className="text-sm text-accent hover:underline">
                  Coba cari lagi
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Status Timeline */}
              <Card className="mb-6 border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Progres Perbaikan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statusOrder.map((status, i) => {
                      const config = statusConfig[status];
                      const isActive = i <= currentStatusIndex;
                      const isCurrent = i === currentStatusIndex;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isCurrent ? config.color : isActive ? "bg-success/20" : "bg-muted"
                            }`}
                          >
                            <config.icon className={`w-4 h-4 ${isCurrent ? "" : isActive ? "text-success" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                              {config.label}
                            </p>
                          </div>
                          {isCurrent && <Badge className={config.color}>Saat Ini</Badge>}
                          {isActive && !isCurrent && <CheckCircle2 className="w-4 h-4 text-success" />}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Device Info */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Detail Unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pelanggan</span>
                    <span className="font-medium text-foreground">{demoOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Perangkat</span>
                    <span className="font-medium text-foreground">{demoOrder.device}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal Masuk</span>
                    <span className="font-medium text-foreground">
                      {new Date(demoOrder.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Butuh bantuan?</p>
            <div className="flex items-center justify-center gap-4">
              <a href="tel:+62" className="flex items-center gap-1 text-sm text-accent hover:underline">
                <Phone className="w-4 h-4" /> Telepon
              </a>
              <a href="mailto:" className="flex items-center gap-1 text-sm text-accent hover:underline">
                <Mail className="w-4 h-4" /> Email
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrackingPage;
