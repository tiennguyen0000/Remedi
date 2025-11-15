import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MedicineExchangeForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Đổi thuốc</CardTitle>
        <CardDescription>Trao đổi thuốc với các nhà thuốc khác</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Tính năng đang được phát triển...
        </p>
      </CardContent>
    </Card>
  );
}
