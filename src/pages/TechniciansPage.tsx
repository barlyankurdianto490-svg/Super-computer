import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TechniciansPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kelola Teknisi</h1>
        <p className="text-muted-foreground">Setujui atau tolak pendaftaran teknisi baru.</p>
      </div>

      <Card className="border-border shadow-card">
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum Ada Teknisi Terdaftar</p>
            <p className="text-sm mt-1">Teknisi yang mendaftar akan muncul di sini untuk disetujui.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechniciansPage;
