const express = require('express');
const router = express.Router();

const { asyncHandler, authUser } = require('../auth/checkAuth');

const viewProductController = require('../controllers/viewProduct.controller');

router.post('/create', authUser, asyncHandler(viewProductController.createViewProduct));
router.get('/get-view-product', authUser, asyncHandler(viewProductController.getViewProduct));

module.exports = router;
