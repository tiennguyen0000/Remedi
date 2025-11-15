import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ReviewSubmissions() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [nhaThuocMap, setNhaThuocMap] = useState<Record<string, any>>({});

  const load = async () => {
    if (!user) return; // Guard clause

    try {
      const data = (await apiFetch("/api/ho-so-xu-ly/enriched")) as any[];
      setList(data || []);
    } catch (err) {
      console.warn("Failed to load submissions:", err);
      setList([]);
      return;
    }

    try {
      const nh = (await apiFetch("/api/nha-thuoc")) as any[];
      const map: Record<string, any> = {};
      nh.forEach((n: any) => (map[n.id] = n));
      setNhaThuocMap(map);
    } catch (err) {
      console.warn("Failed to load nha-thuoc:", err);
      setNhaThuocMap({});
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const open = (item: any) => setDetail(item);

  const classify = async (id: string, ket_qua: string) => {
    if (!confirm(`Xác nhận phân loại ${ket_qua}?`)) return;
    const points =
      Number(prompt("Số điểm thưởng (mặc định để trống để không cộng)", "")) ||
      0;
    try {
      await apiFetch(`/api/ho-so-xu-ly/${id}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ket_qua, points }),
      });
    } catch (err) {
      alert("Lỗi khi phân loại");
      return;
    }
    alert("Đã phân loại");
    setDetail(null);
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Duyệt hồ sơ</h1>

      {!user ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Vui lòng đăng nhập để duyệt hồ sơ
            </p>
            <Link to="/login">
              <Button>Đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            {list.map((r) => (
              <div
                key={r.id}
                className="border rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">
                    #{r.id.slice(0, 8)} · {r.so_luong} {r.don_vi_tinh}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nhà thuốc:{" "}
                    {nhaThuocMap[r.id_nha_thuoc]?.ten || r.id_nha_thuoc}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trạng thái: {r.ket_qua}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => open(r)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground"
                  >
                    Chi tiết
                  </button>
                  {user &&
                    (user.role === "ADMIN" || user.role === "CONGTACVIEN") && (
                      <>
                        <button
                          onClick={() => classify(r.id, "TAI_SU_DUNG")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
                        >
                          Tái sử dụng
                        </button>
                        <button
                          onClick={() => classify(r.id, "TIEU_HUY")}
                          className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground"
                        >
                          Tiêu hủy
                        </button>
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
          <aside className="border rounded-xl p-4 bg-card">
            <h3 className="font-semibold mb-2">Chi tiết</h3>
            {detail ? (
              <div>
                <div className="text-sm">ID: {detail.id}</div>
                <div className="text-sm">Người nộp: {detail.id_nguoi_nop}</div>
                <div className="text-sm">
                  Số lượng: {detail.so_luong} {detail.don_vi_tinh}
                </div>
                <div className="text-sm">
                  Hạn dùng: {detail.han_dung || "—"}
                </div>
                <div className="text-sm">Ghi chú: {detail.ghi_chu || "—"}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => classify(detail.id, "TAI_SU_DUNG")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
                  >
                    Tái sử dụng
                  </button>
                  <button
                    onClick={() => classify(detail.id, "TIEU_HUY")}
                    className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground"
                  >
                    Tiêu hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Chọn hồ sơ để xem chi tiết.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
