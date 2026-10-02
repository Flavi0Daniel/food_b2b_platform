import { Router } from 'express';
import addressesRoutes from '../modules/addresses/addresses.routes';
import authRoutes from '../modules/auth/auth.routes';
import categoriesRoutes from '../modules/categories/categories.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import filesRoutes from '../modules/files/files.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import productsRoutes from '../modules/products/products.routes';
import purchaseOrdersRoutes from '../modules/purchase-orders/purchase-orders.routes';
import shipmentsRoutes from '../modules/shipments/shipments.routes';
import supplierProductsRoutes from '../modules/supplier-products/supplier-products.routes';
import usersRoutes from '../modules/users/users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/addresses', addressesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productsRoutes);
router.use('/supplier-products', supplierProductsRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/files', filesRoutes);

export default router;
