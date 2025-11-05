const express = require('express');
const router = express.Router();

const { asyncHandler, authUser } = require('../auth/checkAuth');

const paymentsController = require('../controllers/payments.controller');

router.post('/create', authUser, asyncHandler(paymentsController.createPayment));
router.get('/check-payment-momo', asyncHandler(paymentsController.checkPaymentMomo));
router.get('/check-payment-vnpay', asyncHandler(paymentsController.checkPaymentVnpay));
router.get('/payment-success', asyncHandler(paymentsController.getPaymentById));
router.get('/payment-by-user', authUser, asyncHandler(paymentsController.getPaymentByUserId));
router.post('/cancel-order', authUser, asyncHandler(paymentsController.cancelOrder));

router.get('/get-payments-admin', authUser, asyncHandler(paymentsController.getPaymentsAdmin));
router.post('/update-order-status', authUser, asyncHandler(paymentsController.updateOrderStatus));

module.exports = router;
