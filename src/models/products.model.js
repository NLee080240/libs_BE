const mongoose = require('mongoose');

const { Schema } = mongoose;

const productsSchema = new Schema(
    {
        nameProduct: { type: String, require: true },
        price: { type: Number, require: true },
        description: { type: String, require: true },
        images: { type: Array, require: true },
        category: { type: String, require: true },
        stock: { type: Number, require: true },
        publisher: { type: String, require: true }, // công ty phát hành
        publishingHouse: { type: String, require: true }, // nhà xuất bản
        coverType: { type: String, require: true, enum: ['paperback', 'hardcover'] }, // Loại bìa
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('products', productsSchema);
