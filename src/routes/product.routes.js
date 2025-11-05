const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const { asyncHandler, authUser } = require('../auth/checkAuth');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/products');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

var upload = multer({ storage: storage });

const productsController = require('../controllers/products.controller');

router.post('/upload-images', authUser, upload.array('images'), asyncHandler(productsController.uploadImages));
router.post('/create', authUser, asyncHandler(productsController.createProduct));
router.get('/get-products', asyncHandler(productsController.getProducts));
router.post('/update', authUser, asyncHandler(productsController.updateProduct));
router.post('/delete-image', authUser, asyncHandler(productsController.deleteImage));
router.post('/delete-product', authUser, asyncHandler(productsController.deleteProduct));
router.get('/get-product-by-id', asyncHandler(productsController.getProductById));
router.get('/search-product', asyncHandler(productsController.SearchProduct));
router.get('/stats/range', asyncHandler(productsController.getStatsInRange));
module.exports = router;
