import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, Clock, Bell, ChevronRight, Wrench, FileCheck, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import logoIcon from "@/assets/logo-icon.png";

const Index = () => {
  const [ticketNumber, setTicketNumber] = useState("");
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketNumber.trim()) {
      navigate(`/track/${ticketNumber.trim()}`);
    }
  };

  const features = [
    {
      icon: Clock,
      title: "Tracking Real-Time",
      description: "Pantau progres perbaikan unit Anda secara langsung tanpa perlu menghubungi kami.",
    },
    {
      icon: Shield,
      title: "Data Terjamin",
      description: "Dokumentasi lengkap kondisi unit sebelum dan sesudah perbaikan.",
    },
    {
      icon: Bell,
      title: "Notifikasi Instan",
      description: "Dapatkan pemberitahuan otomatis setiap kali ada update status unit.",
    },
    {
      icon: FileCheck,
      title: "Nota Digital",
      description: "Nota servis digital otomatis saat unit selesai diperbaiki.",
    },
  ];

  const steps = [
    { number: "01", title: "Serahkan Unit", description: "Bawa unit Anda ke lokasi kami untuk pemeriksaan awal." },
    { number: "02", title: "Diagnosa", description: "Teknisi ahli akan melakukan diagnosa kerusakan secara menyeluruh." },
    { number: "03", title: "Perbaikan", description: "Proses perbaikan dengan update progres real-time." },
    { number: "04", title: "Selesai", description: "Unit selesai, nota digital dikirim, siap diambil." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Duper Computer" className="w-8 h-8" />
            <span className="text-lg font-bold text-foreground">Duper Computer</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/login")}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Login Staff
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/60" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 mb-6">
              <QrCode className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Lacak via Tiket atau QR Code</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 leading-tight">
              Lacak Servis Unit
              <br />
              <span className="text-gradient">Anda Secara Real-Time</span>
            </h1>

            <p className="text-lg text-primary-foreground/70 mb-8 max-w-xl mx-auto">
              Masukkan nomor tiket servis untuk melihat status perbaikan unit Anda secara langsung. Tanpa login, tanpa ribet.
            </p>

            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Masukkan nomor tiket..."
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="pl-10 h-12 bg-card/95 backdrop-blur border-0 text-card-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" className="h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                Lacak
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">Kenapa Memilih Kami?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Sistem manajemen servis terintegrasi dengan teknologi modern.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">Alur Servis</h2>
            <p className="text-muted-foreground">Proses transparan dari awal hingga akhir.</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="text-5xl font-extrabold text-accent/20 mb-2">{step.number}</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-3 w-6 h-6 text-accent/40" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-accent" />
            <span className="font-bold text-primary-foreground">Duper Computer</span>
          </div>
          <p className="text-sm text-primary-foreground/60">
            © 2026 Duper Computer Apps. Sistem Manajemen Servis Terintegrasi.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
