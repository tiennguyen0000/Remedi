// Base Medicine type for form submission
export interface MedicineInput {
  name: string;
  quantity: number;
  expiry: string;
  type: string;
  condition: "NEW" | "OPENED" | "EXPIRED";
  notes?: string;
}

// Full Medicine type with all fields
export interface Medicine extends MedicineInput {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}
