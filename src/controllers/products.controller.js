const modelProduct = require('../models/products.model');
const modelCart = require('../models/cart.model');
const mongoose = require('mongoose');
const cloudinary = require('../utils/configCloudDinary');
const dayjs = require('dayjs');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

function getPublicId(url) {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');

    if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL');
    }

    const pathParts = parts.slice(uploadIndex + 1);
    const pathWithoutVersion = pathParts[0].startsWith('v') ? pathParts.slice(1) : pathParts;
    const publicIdWithExt = pathWithoutVersion.join('/');
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

    return publicId;
}
function buildVNInsensitiveRegex(inputRaw = '') {
  const input = String(inputRaw).trim();
  if (!input) return null;
  const VN = {
    a: 'aàáạảãâầấậẩẫăằắặẳẵAÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ',
    e: 'eèéẹẻẽêềếệểễEÈÉẸẺẼÊỀẾỆỂỄ',
    i: 'iìíịỉĩIÌÍỊỈĨ',
    o: 'oòóọỏõôồốộổỗơờớợởỡOÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ',
    u: 'uùúụủũưừứựửữUÙÚỤỦŨƯỪỨỰỬỮ',
    y: 'yỳýỵỷỹYỲÝỴỶỸ',
    d: 'dđDĐ',
  };
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let pattern = '';
  for (const ch of input) {
    const lower = ch.toLowerCase();
    if (VN[lower]) {
      const cls = escapeRegex(VN[lower]);
      pattern += `[${cls}]`;
    } else if (/\s/.test(ch)) {
      pattern += `\\s+`;
    } else {
      pattern += escapeRegex(ch);
    }
  }

  try {
    return new RegExp(pattern, 'i'); 
  } catch {
    return null;
  }
}
function getRange(type = 'day', dateStr) {
  const base = dateStr ? dayjs(dateStr) : dayjs();
  if (!base.isValid()) throw new BadRequestError('date không hợp lệ');

  switch (type) {
    case 'day':   return { start: base.startOf('day').toDate(),   end: base.endOf('day').toDate() };
    case 'month': return { start: base.startOf('month').toDate(), end: base.endOf('month').toDate() };
    case 'year':  return { start: base.startOf('year').toDate(),  end: base.endOf('year').toDate() };
    default: throw new BadRequestError('type không hợp lệ (day|month|year)');
  }
}

function dateKey(type) {
  if (type === 'day')   return { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } };
  if (type === 'month') return { $dateToString: { format: '%Y-%m',    date: '$updatedAt' } };
  return { $dateToString: { format: '%Y',       date: '$updatedAt' } };
}
const fs = require('fs/promises');

class ProductsController {
    async getStatsInRange (req, res, next){
        try {
            const { from, to, granularity = 'day' } = req.query;
            if (!from || !to) throw new BadRequestError('Thiếu from/to (YYYY-MM-DD)');

            const start = dayjs(from).startOf('day');
            const end   = dayjs(to).endOf('day');
            if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
            throw new BadRequestError('Khoảng thời gian không hợp lệ');
            }

            // 1) Tổng thư viện (không phụ thuộc khoảng)
            const [libAgg] = await modelProduct.aggregate([
            { $group: { _id: null, totalTitles: { $sum: 1 }, totalCopies: { $sum: { $ifNull: ['$stock', 0] } } } }
            ]);

            // 2) Tổng mượn trong khoảng
            const borrowedAgg = await modelCart.aggregate([
            { $match: { updatedAt: { $gte: start.toDate(), $lte: end.toDate() } } },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: false } },
            { $group: { _id: null, totalBorrowedInRange: { $sum: { $ifNull: ['$product.quantity', 0] } } } }
            ]);

            // 3) Series theo granularity (day => '%Y-%m-%d', month => '%Y-%m')
            const fmt = granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';
            const borrowedSeriesAgg = await modelCart.aggregate([
            { $match: { updatedAt: { $gte: start.toDate(), $lte: end.toDate() } } },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: false } },
            {
                $group: {
                _id: { $dateToString: { format: fmt, date: '$updatedAt' } },
                totalBorrowed: { $sum: { $ifNull: ['$product.quantity', 0] } },
                }
            },
            { $sort: { _id: 1 } }
            ]);

            return new OK({
            message: 'Thống kê theo khoảng thời gian',
            metadata: {
                range: { from: start.toDate(), to: end.toDate() },
                granularity,
                library: {
                totalTitles: libAgg?.totalTitles || 0,
                totalCopies: libAgg?.totalCopies || 0
                },
                borrowed: {
                totalBorrowedInRange: borrowedAgg[0]?.totalBorrowedInRange || 0
                },
                series: {
                borrowedSeries: borrowedSeriesAgg.map(d => ({ period: d._id, totalBorrowed: d.totalBorrowed }))
                }
            }
            }).send(res);
        } catch (err) { next(err); }
    };
    async createProduct(req, res) {
        const { nameProduct, images, price, description, category, stock, publisher, publishingHouse, coverType } =
            req.body;
            console.log(nameProduct, images, price, description, category, stock, publisher, publishingHouse, coverType);
        if (
            !nameProduct ||
            !price ||
            !description ||
            !category ||
            !stock ||
            !publisher ||
            !publishingHouse ||
            !coverType ||
            !images
        ) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const product = await modelProduct.create({
            nameProduct,
            price,
            description,
            category,
            stock,
            images,
            publisher,
            publishingHouse,
            coverType,
        });
        return new Created({
            message: 'Tạo sản phẩm thành công',
            metadata: product,
        }).send(res);
    }

    async uploadImages(req, res) {
        try {
            const files = req.files;

            const dataFile = await Promise.all(
                files.map(async (item) => {
                    const result = await cloudinary.uploader.upload(item.path, {
                        folder: 'products',
                        resource_type: 'image',
                    });
                    await fs.unlink(item.path);
                    return result.secure_url;
                }),
            );

            return new OK({
                message: 'Upload ảnh thành công',
                metadata: dataFile,
            }).send(res);
        } catch (error) {
            console.error(error);
            return new BadRequestError('Lỗi khi upload ảnh').send(res);
        }
    }

    async deleteImage(req, res) {
        const { id, image } = req.body;
        const product = await modelProduct.findById(id);
        const publicId = getPublicId(image);
        await cloudinary.uploader.destroy(publicId);
        product.images = product.images.filter((img) => img !== image);
        await product.save();
        return new OK({
            message: 'Xóa ảnh thành công',
            metadata: product,
        }).send(res);
    }

    async getProducts(req, res) {
        const products = await modelProduct.find();
        return new OK({
            message: 'Lấy sản phẩm thành công',
            metadata: products,
        }).send(res);
    }

    async updateProduct(req, res) {
        const { id, nameProduct, images, price, description, category, stock, publisher, publishingHouse, coverType } =
            req.body;
        const product = await modelProduct.findByIdAndUpdate(id, {
            nameProduct,
            price,
            description,
            category,
            stock,
            publisher,
            publishingHouse,
            images,
            coverType,
        });
        return new OK({
            message: 'Cập nhật sản phẩm thành công',
            metadata: product,
        }).send(res);
    }

    async deleteProduct(req, res) {
        const { id } = req.body;
        const product = await modelProduct.findByIdAndDelete(id);
        product.images.forEach(async (image) => {
            const publicId = getPublicId(image);
            await cloudinary.uploader.destroy(publicId);
        });
        return new OK({
            message: 'Xóa sản phẩm thành công',
            metadata: product,
        }).send(res);
    }

    async getProductById(req, res) {
        const { id } = req.query;
        const product = await modelProduct.findById(id);
        return new OK({
            message: 'Lấy sản phẩm thành công',
            metadata: product,
        }).send(res);
    }

    async SearchProduct(req, res, next) {
    try {
        const q = (req.query?.nameProduct || '').trim();
        if (!q || q === 'undefined') {
        return new OK({ message: 'Không tìm thấy sản phẩm', metadata: [] }).send(res);
        }

        // Regex “bỏ dấu” và cả từ khóa gốc (để match chính xác hơn)
        const rxNoAccent = buildVNInsensitiveRegex(q);
        const rxRaw      = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        // Tìm trên nhiều field bạn có (tối thiểu nameProduct)
        const orClauses = [];
        if (rxNoAccent) {
        orClauses.push({ nameProduct: rxNoAccent });
        orClauses.push({ sku: rxNoAccent });
        orClauses.push({ author: rxNoAccent });
        }
        orClauses.push({ nameProduct: rxRaw });

        const dataProducts = await modelProduct
        .find({ $or: orClauses })
        .limit(20)
        .lean();

        if (!dataProducts || dataProducts.length === 0) {
        return new OK({
            message: `Không tìm thấy sản phẩm phù hợp với “${q}”`,
            metadata: []
        }).send(res);
        }

        const validProducts = dataProducts.filter((p) => mongoose.Types.ObjectId.isValid(p._id));
        return new OK({
        message: 'Tìm kiếm sản phẩm thành công',
        metadata: validProducts
        }).send(res);
    } catch (err) {
        next(err);
    }
    }
}

module.exports = new ProductsController();
