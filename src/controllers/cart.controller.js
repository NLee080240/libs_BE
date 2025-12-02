const modelCart = require('../models/cart.model');
const modelProduct = require('../models/products.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');
const usersModel = require('../models/users.model');

class CartController {
    
    async createCart(req, res) {
    const { id } = req.user;
    // Lấy phần tử đầu tiên trong items
    const item = Array.isArray(req.body.items) ? req.body.items[0] : req.body;
    const { product, startDate, endDate, quantity } = item;
// oke  console.log("Kiểm tra req.body", req.body);
    // Validate dữ liệu
    if (!product || !quantity || quantity <= 0) {
        console.log("Kiểm tra quantity", quantity);
        throw new BadRequestError('Thiếu hoặc sai thông tin sản phẩm hoặc số lượng');
    }

    const user = await usersModel.findOne({ _id: id });

    const findProduct = await modelProduct.findById(product);
    if (!findProduct) {
        throw new BadRequestError('Sản phẩm không tồn tại');
    }

    let cart = await modelCart.findOne({ userId: id });

    if (cart) {
        const productIndex = cart.product.findIndex(
        (item) => item.productId.toString() === product.toString()
        );

        if (productIndex !== -1) {
        cart.product[productIndex].quantity += quantity;
        } else {
        cart.product.push({ productId: product, quantity, startDate, endDate });
        }

        cart.totalPrice += findProduct.price * quantity;
        await cart.save();

        return new OK({
        message: 'Tạo phiếu mượn thành công',
        metadata: cart,
        }).send(res);
    } else {
        const newCart = await modelCart.create({
        userId: id,
        user:user,
        product: [{ productId: product, quantity, startDate, endDate }],
        totalPrice: findProduct.price * quantity,
        status: 'approved',
        fullName: req.user.fullName || '',
        phone: req.user.phone || '',
        address: req.user.address || '',
        });

        return new OK({
        message: 'Tạo giỏ hàng thành công',
        metadata: newCart,
        }).send(res);
    }
    }

    // Controller
    async getCart(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
            }

            // Lấy giỏ (lean để nhận plain object, an toàn khi spread)
            const cart = await modelCart.findOne({ userId }).lean();

            // Nếu chưa có giỏ → trả mảng rỗng, KHÔNG 500
            if (!cart || !Array.isArray(cart.product) || cart.product.length === 0) {
            return new OK({
                message: 'Giỏ hàng trống',
                metadata: [],
            }).send(res);
            }

            // Map từng item → kèm product (có thể null nếu sản phẩm bị xoá)
            const items = await Promise.all(
                cart.product.map(async (item) => {
                    const product = await modelProduct.findById(item.productId).lean();
                    const qty = Number(item.quantity) || 1;
                    const price = Number(product?.price) || 0;

                    return {
                    _id: item._id,
                    nameProduct: product?.nameProduct || 'Sản phẩm không tồn tại',
                    productId: item.productId,
                    quantity: qty,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    image: product?.images || null,
                    product: product || null,
                    totalPrice: price * qty,
                    };
                })
            );

            return new OK({
            message: 'Lấy giỏ hàng thành công',
            metadata: items,
            }).send(res);
        } catch (err) {
            next(err); // để middleware error xử lý, tránh 500 không rõ
        }
    }

    async getAllCart(req, res, next) {
        try {
            const cart = await modelCart.find();
            return new OK({
            message: 'Lấy giỏ hàng thành công',
            metadata: cart,
            }).send(res);
        } catch (err) {
            next(err);
        }
    }


    async updateQuantity(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        // Validate
        if (!productId || !quantity || quantity <= 0) {
            throw new BadRequestError('Thông tin sản phẩm hoặc số lượng không hợp lệ');
        }

        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }

        const productIndex = cart.product.findIndex((item) => item.productId.toString() === productId.toString());

        if (productIndex === -1) {
            throw new BadRequestError('Sản phẩm không có trong giỏ hàng');
        }

        // Cập nhật số lượng
        cart.product[productIndex].quantity = quantity;

        // Cập nhật lại tổng giá
        const productData = await modelProduct.findById(productId);
        if (!productData) {
            throw new BadRequestError('Sản phẩm không tồn tại trong hệ thống');
        }

        // Tính lại toàn bộ totalPrice từ giỏ hàng
        let newTotal = 0;
        for (const item of cart.product) {
            const productInfo = await modelProduct.findById(item.productId);
            if (productInfo) {
                newTotal += productInfo.price * item.quantity;
            }
        }
        cart.totalPrice = newTotal;

        await cart.save();

        return new OK({
            message: 'Cập nhật số lượng thành công',
            metadata: cart,
        }).send(res);
    }

    async deleteItem(req, res) {
        const { id } = req.user;
        const { productId } = req.body;

        const cart = await modelCart.findOne({ userId: id });

        if (!cart) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }

        const productIndex = cart.product.findIndex((item) => item.productId.toString() === productId.toString());

        if (productIndex === -1) {
            throw new BadRequestError('Sản phẩm không có trong giỏ hàng');
        }

        cart.product.splice(productIndex, 1);
        await cart.save();

        return new OK({
            message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
            metadata: cart,
        }).send(res);
    }

    async updateInfoCart(req, res) {
        const { fullName, phone, address } = req.body;
        const { id } = req.user;
        if (!fullName || !phone || !address) {
            throw new BadRequestError('Vui lòng nhập thông tin thuê');
        }
        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }
        cart.fullName = fullName;
        cart.phone = phone;
        cart.address = address;
        await cart.save();
        return new OK({
            message: 'Cập nhật thông tin giỏ hàng thành công',
            metadata: cart,
        }).send(res);
    }

    async updateInfoCartByAdmin(req, res) {
        const { fullName, phone, address ,status,id} = req.body;
        const cart = await modelCart.findOne({ userId: id });

       
        if (!cart) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }
    
        cart.status = status;
        await cart.save();
        return new OK({
            message: 'Cập nhật thông tin giỏ hàng thành công',
            metadata: cart,
        }).send(res);
    }
    async extendBorrow(req, res) {
        const { productId, endDate } = req.body;
        const { id } = req.user;
        if (!productId || !endDate) {
            throw new BadRequestError('Vui lòng nhập thông tin gia hạn');
        }
        const cart = await modelCart.findOne({ userId: id });
        if (!cart) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }
        const productIndex = cart.product.findIndex((item) => item.productId.toString() === productId.toString());
        if (productIndex === -1) {
            throw new BadRequestError('Sản phẩm không có trong giỏ hàng');
        }
        cart.product[productIndex].endDate = endDate;
        await cart.save();
        return new OK({
            message: 'Gia hạn thời gian thuê thành công',
            metadata: cart,
        }).send(res);
    }
    async getBorrowingBooks(req, res, next) {
        try {
            const now = new Date();
            const carts = await modelCart.find().lean();
            if (!carts || carts.length === 0) {
            return new OK({
                message: 'Hiện không có sách nào đang được mượn',
                metadata: [],
            }).send(res);
            }

            const borrowingItems = [];

            for (const cart of carts) {
            if (!Array.isArray(cart.product)) continue;
            for (const item of cart.product) {
                const start = item.startDate ? new Date(item.startDate) : null;
                const end   = item.endDate   ? new Date(item.endDate)   : null;
                borrowingItems.push({
                cartId:   cart._id,
                userId:   cart.userId,
                fullName: cart.fullName || cart.user?.fullName || 'N/A',
                phone:    cart.phone   || cart.user?.phone    || '',
                address:  cart.address || '',

                status:    cart.status,
                createdAt: cart.createdAt,

                bookId:    item.productId,     
                quantity:  item.quantity,
                startDate: item.startDate,
                endDate:   item.endDate,
                });
                // }
            }
            }

            if (borrowingItems.length === 0) {
            return new OK({
                message: 'Hiện không có sách nào đang được mượn',
                metadata: [],
            }).send(res);
            }
            const bookIds = [...new Set(borrowingItems.map(i => i.bookId.toString()))];

            const books = await modelProduct.find({
            _id: { $in: bookIds },
            }).lean();

            const bookMap = books.reduce((acc, book) => {
            acc[book._id.toString()] = book;
            return acc;
            }, {});

            const result = borrowingItems.map(item => {
            const book  = bookMap[item.bookId.toString()] || null;
            const qty   = Number(item.quantity) || 1;
            const price = Number(book?.price)   || 0;

            return {
                cartId:   item.cartId,
                userId:   item.userId,
                fullName: item.fullName,
                phone:    item.phone,
                address:  item.address,

                status:    item.status,
                createdAt: item.createdAt,

                bookId:    item.bookId,
                bookName:  book?.nameProduct || 'Sách không tồn tại',
                image:     book?.images   || null,
                book,

                quantity:  qty,
                startDate: item.startDate,
                endDate:   item.endDate,

                totalPrice: qty * price,
            };
            });

            return new OK({
            message: 'Lấy danh sách sách đang được mượn thành công',
            metadata: result,
            }).send(res);
        } catch (err) {
            next(err);
        }
    }



}

module.exports = new CartController();
