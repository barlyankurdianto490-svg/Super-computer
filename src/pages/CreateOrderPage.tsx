import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, X, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SAVED_CUSTOMER_KEY = "duper_saved_customer";

const serviceTypes = [
  { value: "non_warranty", label: "Non Garansi", desc: "Servis berbayar tanpa garansi" },
  { value: "warranty_store", label: "Garansi Toko", desc: "Garansi dari toko kami" },
  { value: "warranty_partner", label: "Garansi Partner", desc: "Garansi dari partner resmi" },
];

const conditionOptions = ["Normal", "No Power", "Auto Shutdown", "Bluescreen", "Hang/Freeze", "Lainnya"];

const checkItems = [
  { key: "speaker", label: "Speaker" },
  { key: "camera", label: "Camera" },
  { key: "touchpad", label: "Touchpad" },
  { key: "keyboard", label: "Keyboard" },
  { key: "wifi", label: "Wifi" },
];

const photoLabels = [
  { key: "atas", label: "Atas" },
  { key: "bawah", label: "Bawah" },
  { key: "depan", label: "Depan" },
  { key: "belakang", label: "Belakang" },
];

interface FormData {
  service_type: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  remember_customer: boolean;
  device_type: string;
  device_brand: string;
  device_model: string;
  device_password: string;
  unit_condition: string;
  unit_accessories: string;
  damage_description: string;
  unit_checks: Record<string, boolean>;
  estimated_cost: string;
  notes: string;
}

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    atas: null, bawah: null, depan: null, belakang: null,
  });
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    service_type: "non_warranty",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    remember_customer: false,
    device_type: "",
    device_brand: "",
    device_model: "",
    device_password: "",
    unit_condition: "Normal",
    unit_accessories: "",
    damage_description: "",
    unit_checks: { speaker: false, camera: false, touchpad: false, keyboard: false, wifi: false },
    estimated_cost: "",
    notes: "",
  });

  // Load saved customer
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CUSTOMER_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setForm(f => ({ ...f, customer_name: data.name || "", customer_phone: data.phone || "", customer_email: data.email || "", remember_customer: true }));
      }
    } catch {}
  }, []);

  const updateForm = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const toggleCheck = (key: string) => setForm(f => ({ ...f, unit_checks: { ...f.unit_checks, [key]: !f.unit_checks[key] } }));

  const handlePhoto = (key: string, file: File | null) => {
    setPhotos(p => ({ ...p, [key]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(p => ({ ...p, [key]: url }));
    } else {
      setPhotoPreview(p => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!form.service_type;
      case 1: return !!form.customer_name.trim() && !!form.customer_phone.trim();
      case 2: return !!form.device_brand.trim();
      case 3: return !!form.damage_description.trim();
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setCreating(true);
    try {
      // Save customer if checkbox
      if (form.remember_customer) {
        localStorage.setItem(SAVED_CUSTOMER_KEY, JSON.stringify({ name: form.customer_name, phone: form.customer_phone, email: form.customer_email }));
      } else {
        localStorage.removeItem(SAVED_CUSTOMER_KEY);
      }

      // Insert order
      const { data: order, error } = await supabase.from("service_orders").insert({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        device_type: form.device_type || form.device_brand,
        device_brand: form.device_brand,
        device_model: form.device_model || null,
        device_password: form.device_password || null,
        damage_description: form.damage_description,
        unit_condition: form.unit_condition,
        unit_accessories: form.unit_accessories || null,
        unit_checks: form.unit_checks,
        service_type: form.service_type,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : 0,
        notes: form.notes || null,
        created_by: user?.id,
        ticket_number: "",
      } as any).select().single();

      if (error) throw error;

      // Upload photos
      const orderData = order as any;
      const photoEntries = Object.entries(photos).filter(([, f]) => f !== null);
      for (const [label, file] of photoEntries) {
        if (!file) continue;
        const ext = file.name.split(".").pop();
        const path = `${orderData.id}/${label}.${ext}`;
        const { error: upErr } = await supabase.storage.from("unit-photos").upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("unit-photos").getPublicUrl(path);
          await supabase.from("service_photos").insert({
            order_id: orderData.id,
            photo_url: urlData.publicUrl,
            label,
          });
        }
      }

      // Create initial service_update
      await supabase.from("service_updates").insert({
        order_id: orderData.id,
        status: "received",
        description: "Unit diterima dan data telah dicatat.",
        updated_by: user?.id,
      });

      toast({ title: "Pesanan Dibuat!", description: `Tiket: ${orderData.ticket_number}` });
      navigate(`/dashboard/orders/${orderData.id}`);
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const steps = ["Tipe Servis", "Kontak", "Unit", "Kondisi", "Preview"];

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/orders")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      <h1 className="text-2xl font-bold text-foreground mb-2">Buat Pesanan Servis Baru</h1>
      <p className="text-sm text-muted-foreground mb-6">Admin: {profile?.full_name || user?.email}</p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-accent text-accent-foreground" : i < step ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < steps.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: Service Type */}
      {step === 0 && (
        <div className="space-y-3 max-w-lg">
          <p className="text-sm font-medium text-foreground mb-2">Pilih Jenis Servis</p>
          {serviceTypes.map(st => (
            <Card
              key={st.value}
              onClick={() => updateForm("service_type", st.value)}
              className={`cursor-pointer transition-all border-2 ${form.service_type === st.value ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.service_type === st.value ? "border-accent" : "border-muted-foreground"}`}>
                  {form.service_type === st.value && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{st.label}</p>
                  <p className="text-xs text-muted-foreground">{st.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: Customer Contact */}
      {step === 1 && (
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.remember_customer}
              onCheckedChange={(c) => updateForm("remember_customer", !!c)}
              id="remember"
            />
            <label htmlFor="remember" className="text-sm text-foreground cursor-pointer">Ingat data pelanggan</label>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Nama Pelanggan *</label>
            <Input value={form.customer_name} onChange={e => updateForm("customer_name", e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">No. HP *</label>
            <Input value={form.customer_phone} onChange={e => updateForm("customer_phone", e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email <span className="text-muted-foreground">(opsional)</span></label>
            <Input value={form.customer_email} onChange={e => updateForm("customer_email", e.target.value)} placeholder="email@contoh.com" type="email" />
          </div>
        </div>
      )}

      {/* Step 2: Unit Details */}
      {step === 2 && (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="text-sm font-medium text-foreground">Jenis Perangkat</label>
            <Input value={form.device_type} onChange={e => updateForm("device_type", e.target.value)} placeholder="Laptop / PC / HP" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Merk *</label>
            <Input value={form.device_brand} onChange={e => updateForm("device_brand", e.target.value)} placeholder="Asus, Lenovo, HP..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Tipe / Model <span className="text-muted-foreground">(opsional)</span></label>
            <Input value={form.device_model} onChange={e => updateForm("device_model", e.target.value)} placeholder="ROG Strix, Ideapad..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Password / PIN Perangkat <span className="text-muted-foreground">(opsional)</span></label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.device_password}
                onChange={e => updateForm("device_password", e.target.value)}
                placeholder="Jika diperlukan untuk diagnosa"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Unit Condition */}
      {step === 3 && (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="text-sm font-medium text-foreground">Kondisi Unit</label>
            <select
              value={form.unit_condition}
              onChange={e => updateForm("unit_condition", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Deskripsi Kerusakan *</label>
            <Textarea value={form.damage_description} onChange={e => updateForm("damage_description", e.target.value)} placeholder="Jelaskan keluhan / kerusakan unit..." />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Foto Unit</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {photoLabels.map(p => (
                <div key={p.key} className="border border-border rounded-lg p-2 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{p.label}</p>
                  {photoPreview[p.key] ? (
                    <div className="relative">
                      <img src={photoPreview[p.key]} alt={p.label} className="w-full h-24 object-cover rounded" />
                      <button onClick={() => handlePhoto(p.key, null)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-muted/50 rounded transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(p.key, e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Kelengkapan Unit</label>
            <Input value={form.unit_accessories} onChange={e => updateForm("unit_accessories", e.target.value)} placeholder="Charger, tas, mouse..." />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Cek Unit (centang jika berfungsi)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {checkItems.map(c => (
                <label key={c.key} className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={form.unit_checks[c.key]} onCheckedChange={() => toggleCheck(c.key)} />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Estimasi Biaya (Rp)</label>
              <Input type="number" value={form.estimated_cost} onChange={e => updateForm("estimated_cost", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Catatan</label>
              <Input value={form.notes} onChange={e => updateForm("notes", e.target.value)} placeholder="Catatan tambahan" />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div className="max-w-lg space-y-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Preview Pesanan</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipe Servis</span><Badge variant="outline">{serviceTypes.find(s => s.value === form.service_type)?.label}</Badge></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{form.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No. HP</span><span className="font-medium">{form.customer_phone}</span></div>
              {form.customer_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{form.customer_email}</span></div>}
              <Separator />
              {form.device_type && <div className="flex justify-between"><span className="text-muted-foreground">Jenis</span><span className="font-medium">{form.device_type}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Merk</span><span className="font-medium">{form.device_brand}</span></div>
              {form.device_model && <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{form.device_model}</span></div>}
              {form.device_password && <div className="flex justify-between"><span className="text-muted-foreground">Password</span><span className="font-medium">••••••</span></div>}
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Kondisi</span><span className="font-medium">{form.unit_condition}</span></div>
              <div><span className="text-muted-foreground">Kerusakan:</span><p className="mt-1 text-foreground">{form.damage_description}</p></div>
              {form.unit_accessories && <div className="flex justify-between"><span className="text-muted-foreground">Kelengkapan</span><span className="font-medium">{form.unit_accessories}</span></div>}

              <div>
                <span className="text-muted-foreground text-xs">Cek Unit:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {checkItems.map(c => (
                    <Badge key={c.key} variant={form.unit_checks[c.key] ? "default" : "outline"} className={`text-xs ${form.unit_checks[c.key] ? "bg-green-100 text-green-800" : "bg-red-50 text-red-600"}`}>
                      {c.label}: {form.unit_checks[c.key] ? "OK" : "NG"}
                    </Badge>
                  ))}
                </div>
              </div>

              {Object.values(photoPreview).some(Boolean) && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">Foto Unit:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {photoLabels.map(p => photoPreview[p.key] ? (
                      <div key={p.key} className="text-center">
                        <img src={photoPreview[p.key]} alt={p.label} className="w-full h-16 object-cover rounded" />
                        <p className="text-xs text-muted-foreground mt-0.5">{p.label}</p>
                      </div>
                    ) : null)}
                  </div>
                </>
              )}

              {form.estimated_cost && (
                <div className="flex justify-between"><span className="text-muted-foreground">Est. Biaya</span><span className="font-medium">Rp {parseFloat(form.estimated_cost || "0").toLocaleString("id-ID")}</span></div>
              )}
              {form.notes && <div className="flex justify-between"><span className="text-muted-foreground">Catatan</span><span className="font-medium">{form.notes}</span></div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8 max-w-lg">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Lanjut <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={creating} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Create Pesanan
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateOrderPage;
