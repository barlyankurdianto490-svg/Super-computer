import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OrdersPage = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pesanan Servis</h1>
          <p className="text-muted-foreground">Kelola semua pesanan servis masuk.</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Buat Pesanan
        </Button>
      </div>

      <Card className="border-border shadow-card">
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum Ada Pesanan</p>
            <p className="text-sm mt-1">Klik "Buat Pesanan" untuk menambahkan pesanan servis baru.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
