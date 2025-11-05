const mongoose = require('mongoose');

const { Schema } = mongoose;

const paymentsSchema = new Schema(
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
        status: { type: String, default: 'pending', enum: ['pending', 'completed', 'cancelled', 'delivered'] },
        paymentMethod: { type: String, default: 'cod' },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('payments', paymentsSchema);
