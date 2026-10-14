export type ProductUnit = 'KG' | 'CAIXA' | 'BALDE' | 'SACO' | 'UNIDADE';

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  baseUnit: ProductUnit;
  imageUrl: string | null;
  isAvailable: boolean;
  sellPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
}
