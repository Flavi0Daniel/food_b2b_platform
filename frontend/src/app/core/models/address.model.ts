export interface Address {
  id: number;
  userId: number;
  label: string | null;
  street: string;
  city: string;
  municipality: string | null;
  referencePoint: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
