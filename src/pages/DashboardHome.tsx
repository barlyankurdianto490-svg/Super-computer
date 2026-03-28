import { motion } from "framer-motion";
import { ClipboardList, Users, Wrench, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Total Pesanan", value: "0", icon: ClipboardList, trend: "Bulan ini" },
  { label: "Dalam Proses", value: "0", icon: Wrench, trend: "Aktif" },
  { label: "Selesai", value: "0", icon: TrendingUp, trend: "Bulan ini" },
  { label: "Teknisi Aktif", value: "0", icon: Users, trend: "Terakreditasi" },
];

const DashboardHome = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan aktivitas servis hari ini.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-5 h-5 text-accent" />
                  <span className="text-xs text-muted-foreground">{stat.trend}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Pesanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada pesanan servis.</p>
            <p className="text-xs mt-1">Buat pesanan baru untuk memulai.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
