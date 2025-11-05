const mongoose = require('mongoose');

const { Schema } = mongoose;

const usersSchema = new Schema(
    {
        fullName: { type: String, require: true },
        email: { type: String, require: true, unique: true },
        password: { type: String, require: true },
        phone: { type: String, require: true },
        role: { type: String, require: true, enum: ['admin', 'student',"teacher"], default: 'student' },
        avatar: { type: String, require: true, default: 'https://cdn-icons-png.flaticon.com/512/6596/6596121.png' },
        address: { type: String, require: true },
        class: { type: String , default: 'Lớp 12' },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('users', usersSchema);
