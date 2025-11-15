import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2Icon, MapPin, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const pharmacyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedPharmacyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to handle map center changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  
  return null;
}

// Wrapper component for all map content
function MapContent({ 
  center, 
  zoom,
  currentUserLocation,
  filteredPharmacies,
  selectedPharmacyId,
  handleMarkerClick,
  userIcon,
  pharmacyIcon,
  selectedPharmacyIcon
}: any) {
  const map = useMap();
  
  // Auto fit bounds to show all markers when search results change
  useEffect(() => {
    if (filteredPharmacies && filteredPharmacies.length > 0) {
      const bounds: [number, number][] = [];
      
      // Add user location to bounds if exists
      if (currentUserLocation) {
        bounds.push([currentUserLocation.lat, currentUserLocation.lng]);
      }
      
      // Add pharmacy locations to bounds
      filteredPharmacies.forEach((pharmacy: any) => {
        const lat = pharmacy.vi_do || pharmacy.lat;
        const lng = pharmacy.kinh_do || pharmacy.lng;
        if (lat && lng) {
          bounds.push([lat, lng]);
        }
      });
      
      // Only fit bounds if we don't have a user location (user location should be center)
      // Or if there are very few markers
      if (bounds.length > 0 && !currentUserLocation && bounds.length <= 5) {
        try {
          map.fitBounds(bounds as any, { padding: [50, 50], maxZoom: 14 });
        } catch (e) {
          console.error("Error fitting bounds:", e);
        }
      }
    }
  }, [filteredPharmacies, currentUserLocation, map]);
  
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} zoom={zoom} />
      {currentUserLocation && (
        <Marker
          position={[currentUserLocation.lat, currentUserLocation.lng]}
          icon={userIcon}
        >
          <Popup>
            <div className="font-medium">Vị trí của bạn</div>
          </Popup>
        </Marker>
      )}
      {filteredPharmacies && filteredPharmacies.length > 0 && filteredPharmacies.map((pharmacy: any) => {
        const lat = pharmacy.vi_do || pharmacy.lat;
        const lng = pharmacy.kinh_do || pharmacy.lng;
        if (!lat || !lng) {
          console.warn("Pharmacy missing coordinates:", pharmacy);
          return null;
        }
        const isSelected = pharmacy.id === selectedPharmacyId;
        const icon = isSelected ? selectedPharmacyIcon : pharmacyIcon;
        return (
          <Marker
            key={pharmacy.id}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: () => handleMarkerClick(pharmacy),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-medium mb-1">
                  {pharmacy.ten_nha_thuoc || pharmacy.ten}
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {pharmacy.dia_chi}
                </div>
                {pharmacy.so_dien_thoai && (
                  <div className="text-sm text-muted-foreground">
                    {pharmacy.so_dien_thoai}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

type Pharmacy = {
  id: string;
  ten_nha_thuoc?: string;
  ten?: string;
  dia_chi?: string;
  so_dien_thoai?: string;
  vi_do?: number;
  kinh_do?: number;
  lat?: number;
  lng?: number;
};

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  selectedPharmacyId?: string;
  onPharmacySelect?: (pharmacy: Pharmacy | null) => void;
  onLocationClick?: (lat: number, lng: number, pharmacy?: Pharmacy) => void;
  userLocation?: { lat: number; lng: number } | null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  function toRad(x: number) {
    return (x * Math.PI) / 180;
  }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PharmacyMap({
  pharmacies,
  selectedPharmacyId,
  onPharmacySelect,
  onLocationClick,
  userLocation,
}: PharmacyMapProps) {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>(pharmacies);
  const [mapLoading, setMapLoading] = useState(false);
  const [addressInput, setAddressInput] = useState<string>("");
  const [currentUserLocation, setCurrentUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(userLocation || null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.7769, 106.7009]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setFilteredPharmacies(pharmacies);
    if (pharmacies.length > 0 && !currentUserLocation) {
      const first = pharmacies[0];
      const lat = first.vi_do || first.lat;
      const lng = first.kinh_do || first.lng;
      if (lat && lng) {
        setMapCenter([lat, lng]);
      }
    }
  }, [pharmacies]);

  useEffect(() => {
    if (userLocation) {
      setCurrentUserLocation(userLocation);
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(13);
    }
  }, [userLocation]);

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Lỗi",
        description: "Trình duyệt của bạn không hỗ trợ định vị",
        variant: "destructive",
      });
      return;
    }

    setMapLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const location = { lat, lng };
        setCurrentUserLocation(location);
        setMapCenter([lat, lng]);
        setMapZoom(13);
        
        // Filter nearest pharmacies
        const withDist = pharmacies
          .map((p) => {
            const pLat = p.vi_do || p.lat;
            const pLng = p.kinh_do || p.lng;
            return {
              ...p,
              distance: pLat && pLng ? haversineDistance(lat, lng, pLat, pLng) : Number.POSITIVE_INFINITY,
            };
          })
          .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
        
        setFilteredPharmacies(
          withDist.filter((x: any) => x.distance !== Number.POSITIVE_INFINITY)
        );
        setMapLoading(false);
        
        toast({
          title: "Đã lấy vị trí của bạn",
          description: "Map đã center vào vị trí của bạn",
        });
      },
      (err) => {
        console.error("Geolocation failed", err);
        toast({
          title: "Lỗi",
          description: "Không thể lấy vị trí của bạn",
          variant: "destructive",
        });
        setMapLoading(false);
      }
    );
  };

  const handleSearchAddress = () => {
    setMapLoading(true);

    if (!addressInput.trim()) {
      setFilteredPharmacies(pharmacies);
      setMapLoading(false);
      return;
    }

    const q = addressInput.trim();
    
    // Check if it's coordinates "lat,lon"
    const coordMatch = q.match(/^\s*([-+]?\d{1,3}\.\d+),\s*([-+]?\d{1,3}\.\d+)\s*$/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lng = Number(coordMatch[2]);
      setCurrentUserLocation({ lat, lng });
      setMapCenter([lat, lng]);
      setMapZoom(13);
      
      // Filter nearest pharmacies from this location
      const withDist = pharmacies
        .map((p) => {
          const pLat = p.vi_do || p.lat;
          const pLng = p.kinh_do || p.lng;
          return {
            ...p,
            distance: pLat && pLng ? haversineDistance(lat, lng, pLat, pLng) : Number.POSITIVE_INFINITY,
          };
        })
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      
      setFilteredPharmacies(
        withDist.filter((x: any) => x.distance !== Number.POSITIVE_INFINITY).slice(0, 10)
      );
      setMapLoading(false);
      return;
    }

    // Text search: match name or address
    const lower = q.toLowerCase();
    const matched = pharmacies.filter(
      (p) =>
        (p.ten_nha_thuoc && p.ten_nha_thuoc.toLowerCase().includes(lower)) ||
        (p.ten && p.ten.toLowerCase().includes(lower)) ||
        (p.dia_chi && p.dia_chi.toLowerCase().includes(lower))
    );
    
    if (matched.length > 0) {
      // console.log("Found pharmacies:", matched.length);
      setFilteredPharmacies(matched);
      
      // CRITICAL: When searching, ALWAYS keep user's location as center if it exists
      // Only center on first match if NO user location is set
      if (currentUserLocation) {
        // Keep user location as center and zoom out a bit to see surrounding pharmacies
        setMapCenter([currentUserLocation.lat, currentUserLocation.lng]);
        setMapZoom(12); // Zoom out slightly to see more area
      } else {
        // No user location, center on first result
        const first = matched[0];
        const lat = first.vi_do || first.lat;
        const lng = first.kinh_do || first.lng;
        if (lat && lng) {
          setMapCenter([lat, lng]);
          setMapZoom(12);
        }
      }
      
      toast({
        title: "Tìm thấy kết quả",
        description: `Tìm thấy ${matched.length} nhà thuốc phù hợp`,
      });
    } else {
      // No match found
      // console.log("No pharmacies found for query:", q);
      setFilteredPharmacies([]);
      toast({
        title: "Không tìm thấy",
        description: "Không tìm thấy nhà thuốc phù hợp với từ khóa",
        variant: "destructive",
      });
    }
    
    setMapLoading(false);
  };

  const handleResetList = () => {
    setFilteredPharmacies(pharmacies);
    if (currentUserLocation) {
      // If in "my location" mode, re-sort by distance
      const withDist = pharmacies
        .map((p) => {
          const pLat = p.vi_do || p.lat;
          const pLng = p.kinh_do || p.lng;
          return {
            ...p,
            distance:
              pLat && pLng
                ? haversineDistance(currentUserLocation.lat, currentUserLocation.lng, pLat, pLng)
                : Number.POSITIVE_INFINITY,
          };
        })
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      setFilteredPharmacies(withDist.filter((x: any) => x.distance !== Number.POSITIVE_INFINITY));
    } else {
      setFilteredPharmacies(pharmacies);
    }
  };

  const handlePharmacyClick = (pharmacy: Pharmacy) => {
    // User clicked on pharmacy in list → Center map on this pharmacy
    if (onPharmacySelect) {
      onPharmacySelect(pharmacy);
    }
    const lat = pharmacy.vi_do || pharmacy.lat;
    const lng = pharmacy.kinh_do || pharmacy.lng;
    if (lat && lng) {
      setMapCenter([lat, lng]);
      setMapZoom(15); // Zoom in closer for selected pharmacy
      // Don't filter, just center
    }
  };

  const handleMarkerClick = (pharmacy: Pharmacy) => {
    if (onPharmacySelect) {
      onPharmacySelect(pharmacy);
    }
    if (onLocationClick) {
      const lat = pharmacy.vi_do || pharmacy.lat;
      const lng = pharmacy.kinh_do || pharmacy.lng;
      if (lat && lng) {
        onLocationClick(lat, lng, pharmacy);
      }
    }
  };

  const selectedPharmacy = useMemo(() => {
    return pharmacies.find((p) => p.id === selectedPharmacyId);
  }, [pharmacies, selectedPharmacyId]);

  if (!isClient) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
        Đang khởi tạo bản đồ...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background">
      {/* Controls - Row 1 */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Nhập vị trí tìm kiếm..."
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchAddress();
              }
            }}
            className="bg-background"
          />
          <Button onClick={handleSearchAddress} disabled={mapLoading}>
            Tìm
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={handleUseGeolocation}
          disabled={mapLoading}
          className="whitespace-nowrap"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Vị trí của bạn
        </Button>
      </div>

      {/* Map - Row 2 (height <= width) */}
      <div 
        className="w-full relative z-[100]"
        style={{ 
          aspectRatio: "16/9",
          maxHeight: "640px",
          minHeight: "460px"
        }}
      >
        {mapLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
        >
          <MapContent
            center={mapCenter}
            zoom={mapZoom}
            currentUserLocation={currentUserLocation}
            filteredPharmacies={filteredPharmacies}
            selectedPharmacyId={selectedPharmacyId}
            handleMarkerClick={handleMarkerClick}
            userIcon={userIcon}
            pharmacyIcon={pharmacyIcon}
            selectedPharmacyIcon={selectedPharmacyIcon}
          />
        </MapContainer>
      </div>

      {/* Pharmacy List - Row 3 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Danh sách nhà thuốc liên kết</h3>
          <div className="flex items-center gap-2">
            {filteredPharmacies.length !== pharmacies.length && (
              <Button variant="ghost" size="sm" onClick={handleResetList}>
                Xem tất cả
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {filteredPharmacies.length} kết quả
            </span>
          </div>
        </div>

        {filteredPharmacies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy nhà thuốc trong khu vực này
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto">
            {filteredPharmacies.map((p) => {
              const isSelected = p.id === selectedPharmacyId;
              return (
                <div
                  key={p.id}
                  onClick={() => handlePharmacyClick(p)}
                  className={`p-3 border rounded-lg hover:border-primary transition-colors bg-card w-full cursor-pointer ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {p.ten_nha_thuoc || p.ten}
                      </div>
                      <div className="text-sm text-muted-foreground truncate flex items-start gap-1 mt-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{p.dia_chi}</span>
                      </div>
                      {p.so_dien_thoai && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {p.so_dien_thoai}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkerClick(p);
                        }}
                      >
                        {isSelected ? "Đã chọn" : "Chọn"}
                      </Button>
                      {!isSelected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            const lat = p.vi_do || p.lat;
                            const lng = p.kinh_do || p.lng;
                            if (lat && lng) {
                              setMapCenter([lat, lng]);
                              setMapZoom(15);
                              toast({
                                title: "Đã hiển thị trên bản đồ",
                                description: `${p.ten_nha_thuoc || p.ten} đã được hiển thị trên bản đồ`,
                              });
                            } else {
                              toast({
                                title: "Không có dữ liệu vị trí",
                                description: "Nhà thuốc này chưa có thông tin tọa độ",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Xem trên bản đồ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
