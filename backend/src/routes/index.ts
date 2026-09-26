import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import productsRoutes from '../modules/products/products.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import purchaseOrdersRoutes from '../modules/purchase-orders/purchase-orders.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import shipmentsRoutes from '../modules/shipments/shipments.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/shipments', shipmentsRoutes);

export default router;
