const modelCategory = require('../models/category.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

const modelProduct = require('../models/products.model');

class categoryController {
    async createCategory(req, res) {
        const { name } = req.body;
        if (!name) {
            throw new BadRequestError('Vui lòng nhập tên danh mục');
        }
        const category = await modelCategory.create({ nameCategory: name });
        return new Created({
            message: 'Tạo danh mục thành công',
            metadata: category,
        }).send(res);
    }

    async getCategory(req, res) {
        const categories = await modelCategory.find();
        const data = await Promise.all(
            categories.map(async (category) => {
                const products = await modelProduct.find({ category: category._id });
                return { ...category._doc, products };
            }),
        );
        return new OK({
            message: 'Lấy danh mục thành công',
            metadata: data,
        }).send(res);
    }

    async deleteCategory(req, res) {
        const { id } = req.body;
        const category = await modelCategory.findByIdAndDelete(id);
        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }
        return new OK({
            message: 'Xóa danh mục thành công',
            metadata: category,
        }).send(res);
    }

    async updateCategory(req, res) {
        const { id, nameCategory } = req.body;
        const category = await modelCategory.findByIdAndUpdate(id, { nameCategory });
        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }
        return new OK({
            message: 'Cập nhật danh mục thành công',
            metadata: category,
        }).send(res);
    }

    async getCategoryById(req, res) {
        const { id } = req.query;
        const category = await modelCategory.findById(id);
        const products = await modelProduct.find({ category: category._id });
        return new OK({
            message: 'Lấy danh mục thành công',
            metadata: { ...category._doc, products },
        }).send(res);
    }
}

module.exports = new categoryController();
