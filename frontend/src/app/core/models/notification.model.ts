export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string | null;
  /** Só preenchido para Cliente e equipa interna (Fornecedor e Transportadora nunca recebem ids de encomendas). */
  relatedOrderId: number | null;
  isRead: boolean;
  createdAt: string;
}
