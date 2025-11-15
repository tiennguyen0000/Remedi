export interface Medicine {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  type: string;
  pharmacyId: string;
  image?: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  points?: number;
  adminFeedback?: string;
}

export interface MedicineExchange {
  id: string;
  medicineOffered: {
    name: string;
    quantity: number;
    expiryDate: string;
    type: string;
    image?: string;
  };
  medicineWanted: {
    type: string;
    quantity: number;
  };
  userId: string;
  status: "open" | "matched" | "completed" | "cancelled";
  createdAt: string;
  matchedWith?: {
    userId: string;
    medicineId: string;
  };
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "active" | "full" | "paused";
  phone: string;
  openingHours: string;
}

export interface ProcessingHistory {
  id: string;
  medicineId: string;
  status: string;
  note?: string;
  processedBy: string;
  processedAt: string;
  points?: number;
}

export interface UserFeedback {
  id: string;
  medicineId: string;
  userId: string;
  pharmacyId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
