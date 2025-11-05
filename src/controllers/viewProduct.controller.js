const modelViewProduct = require('../models/viewProduct.model');
const modelProduct = require('../models/products.model');

const { OK, Created } = require('../core/success.response');

class ViewProductController {
    async createViewProduct(req, res) {
        const { productId } = req.body;
        const { id } = req.user;
        const checkViewProduct = await modelViewProduct.findOne({ userId: id, productId });
        if (checkViewProduct) {
            return new OK({
                message: 'Sản phẩm đã được xem',
            }).send(res);
        }
        const viewProduct = await modelViewProduct.create({ userId: id, productId });
        return new Created({
            message: 'Tạo lượt xem sản phẩm thành công',
            metadata: viewProduct,
        }).send(res);
    }

    async getViewProduct(req, res) {
        const { id } = req.user;
        const viewProduct = await modelViewProduct.find({ userId: id });
        const data = await Promise.all(
            viewProduct.map(async (item) => {
                const product = await modelProduct.findById(item.productId);
                return {
                    ...item._doc,
                    product,
                };
            }),
        );
        return new OK({
            message: 'Lấy lượt xem sản phẩm thành công',
            metadata: data,
        }).send(res);
    }
}

module.exports = new ViewProductController();
