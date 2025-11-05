const mongoose = require('mongoose');

const { Schema } = mongoose;

const viewProductSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'products', required: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('viewProduct', viewProductSchema);
