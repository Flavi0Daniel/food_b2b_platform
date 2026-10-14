export interface SupplierProduct {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierCompany: string | null;
  productId: number;
  productName: string;
  categoryName: string;
  baseUnit: string;
  costPrice: number;
  isActive: boolean;
  updatedAt: string;
}
