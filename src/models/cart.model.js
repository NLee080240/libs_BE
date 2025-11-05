const mongoose = require('mongoose');

const { Schema } = mongoose;

const cartSchema = new Schema(
    {
        userId: { type: String, required: true },
        fullName: { type: String },
        phone: { type: String },
        address: { type: String },
        product: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'product', required: true },
                quantity: { type: Number, required: true },
                startDate: { type: Date },
                endDate: { type: Date },
            },
        ],
        totalPrice: { type: Number, required: true },
        status: { type: String, default: 'pending' },
    user: {
        type: Object,
        }
        ,class: { type: String },
    },
    
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('cart', cartSchema);
