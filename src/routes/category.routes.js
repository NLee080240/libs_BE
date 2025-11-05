const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../auth/checkAuth');

const categoryController = require('../controllers/category.controller');

router.post('/create', asyncHandler(categoryController.createCategory));
router.get('/get', asyncHandler(categoryController.getCategory));
router.post('/delete', asyncHandler(categoryController.deleteCategory));
router.post('/update', asyncHandler(categoryController.updateCategory));
router.get('/get-category-by-id', asyncHandler(categoryController.getCategoryById));

module.exports = router;
