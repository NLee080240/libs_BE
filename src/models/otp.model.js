const mongoose = require('mongoose');

const { Schema } = mongoose;

const otpSchema = new Schema(
    {
        email: { type: String, required: true },
        otp: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 phút
            index: { expires: 0 }, // TTL: tự xoá sau khi expiresAt vượt thời gian hiện tại
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Otp', otpSchema);
