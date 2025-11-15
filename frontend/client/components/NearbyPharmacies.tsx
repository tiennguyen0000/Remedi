import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Pharmacy = {
  id: string;
  ten: string;
  dia_chi: string;
  sdt_lien_he?: string;
  email_lien_he?: string;
  lat?: number;
  lng?: number;
};

export function NearbyPharmacies() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filtered, setFiltered] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [centerQuery, setCenterQuery] = useState<string>("");
  const [addressInput, setAddressInput] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/nha-thuoc");
        const data = await response.json();
        setPharmacies(data || []);
        setFiltered(data || []);
        if (data && data.length > 0) {
          const first = data[0];
          if (first.lat && first.lng)
            setCenterQuery(`${first.lat},${first.lng}`);
          else setCenterQuery(encodeURIComponent(first.dia_chi || "Vietnam"));
        }
      } catch (e) {
        console.error("Failed to load pharmacies", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) return;
    setMapLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setCenterQuery(`${lat},${lng}`);
        // filter nearest
        const withDist = (pharmacies || [])
          .map((p) => ({
            ...p,
            distance:
              p.lat && p.lng
                ? haversineDistance(lat, lng, p.lat!, p.lng!)
                : Number.POSITIVE_INFINITY,
          }))
          .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
        setFiltered(
          withDist
            .filter((x: any) => x.distance !== Number.POSITIVE_INFINITY)
            .slice(0, 10),
        );
        setMapLoading(false);
      },
      (err) => {
        console.error("Geolocation failed", err);
        setMapLoading(false);
      },
    );
  };

  const handleSearchAddress = () => {
    // Reset user location khi search địa chỉ mới
    setUserLocation(null);
    setMapLoading(true);

    if (!addressInput.trim()) return;
    const q = addressInput.trim();
    // if looks like coords "lat,lon"
    const coordMatch = q.match(
      /^\s*([-+]?\d{1,3}\.\d+),\s*([-+]?\d{1,3}\.\d+)\s*$/,
    );
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lng = Number(coordMatch[2]);
      setCenterQuery(`${lat},${lng}`);
      // compute distances and filter top 10
      const withDist = (pharmacies || [])
        .map((p) => ({
          ...p,
          distance:
            p.lat && p.lng
              ? haversineDistance(lat, lng, p.lat!, p.lng!)
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      setFiltered(
        withDist
          .filter((x: any) => x.distance !== Number.POSITIVE_INFINITY)
          .slice(0, 10),
      );
      setMapLoading(false);
      return;
    }

    // text search: match name or address
    const lower = q.toLowerCase();
    const matched = (pharmacies || []).filter(
      (p) =>
        (p.ten && p.ten.toLowerCase().includes(lower)) ||
        (p.dia_chi && p.dia_chi.toLowerCase().includes(lower)),
    );
    setFiltered(matched.length > 0 ? matched : pharmacies || []);
    setCenterQuery(encodeURIComponent(q));
    setMapLoading(false);
  };

  const handleResetList = () => {
    setFiltered(pharmacies);
    if (userLocation) {
      // Nếu đang ở chế độ vị trí của tôi, sắp xếp lại theo khoảng cách
      const withDist = pharmacies
        .map((p) => ({
          ...p,
          distance:
            p.lat && p.lng
              ? haversineDistance(
                  userLocation.lat,
                  userLocation.lng,
                  p.lat!,
                  p.lng!,
                )
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      setFiltered(
        withDist.filter((x: any) => x.distance !== Number.POSITIVE_INFINITY),
      );
    } else {
      // Nếu không, hiển thị toàn bộ danh sách
      setFiltered(pharmacies);
    }
  };
  function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    function toRad(x: number) {
      return (x * Math.PI) / 180;
    }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const mapSrc = `https://www.google.com/maps?q=${centerQuery || "Vietnam"}&z=14&output=embed`;

  return (
    <div className="flex flex-col bg-background">
      {/* Controls - keep on top */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Nhập địa chỉ tìm kiếm..."
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-background"
          />
          <Button onClick={handleSearchAddress}>Tìm</Button>
        </div>
        <Button
          variant="outline"
          onClick={handleUseGeolocation}
          className="whitespace-nowrap"
        >
          Vị trí của tôi
        </Button>
      </div>

      {/* Map - shorter height so length > height */}
      <div className="w-full h-[260px] md:h-[280px] lg:h-[320px] relative">
        {mapLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          title="Google Map"
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>

      {/* List below the map */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Danh sách nhà thuốc liên kết</h3>
          <div className="flex items-center gap-2">
            {filtered.length !== pharmacies.length && (
              <Button variant="ghost" size="sm" onClick={handleResetList}>
                Xem tất cả
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {loading ? "Đang tải..." : `${filtered.length} kết quả`}
            </span>
          </div>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy nhà thuốc trong khu vực này
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="p-3 border rounded-lg hover:border-primary transition-colors bg-card w-full"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.ten}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {p.dia_chi}
                  </div>
                  {p.sdt_lien_he && (
                    <a
                      href={`tel:${p.sdt_lien_he}`}
                      className="text-sm text-primary block mt-1"
                    >
                      {p.sdt_lien_he}
                    </a>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (p.lat && p.lng) {
                        if (userLocation) {
                          // Nếu đang ở chế độ "vị trí của tôi", giữ nguyên center và chỉ hiển thị pharmacy được chọn
                          setFiltered([p]);
                        } else {
                          // Ngược lại, center vào vị trí pharmacy
                          setCenterQuery(`${p.lat},${p.lng}`);
                          setFiltered([p]);
                        }
                      }
                    }}
                  >
                    Xem vị trí
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
