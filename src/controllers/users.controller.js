const modelUser = require('../models/users.model');
const modelApiKey = require('../models/apiKey.model');
const modelCategory = require('../models/category.model');
const modelOtp = require('../models/otp.model');
const XLSX = require('xlsx');

const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');

const cloudinary = require('../utils/configCloudDinary');

const { createToken, createRefreshToken, createApiKey, verifyToken } = require('../services/tokenServices');
const sendMailForgotPassword = require('../utils/sendMailForgotPassword');

const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
const fs = require('fs/promises');
const otpGenerator = require('otp-generator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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

class usersController {
    async register(req, res) {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !email || !password || !phone) {
            throw new BadRequestError('Vui lòng nhập đày đủ thông tin');
        }
        const user = await modelUser.findOne({ email });
        if (user) {
            throw new BadRequestError('Người dùng đã tồn tại');
        } else {
            const saltRounds = 10;
            const salt = bcrypt.genSaltSync(saltRounds);
            const passwordHash = bcrypt.hashSync(password, salt);
            const newUser = await modelUser.create({
                fullName,
                email,
                password: passwordHash,
                phone,
            });
            await newUser.save();
            await createApiKey(newUser._id);
            const token = await createToken({ id: newUser._id });
            const refreshToken = await createRefreshToken({ id: newUser._id });
            res.cookie('token', token, {
                httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // Chống tấn công CSRF
                maxAge: 15 * 60 * 1000, // 15 phút
            });

            res.cookie('logged', 1, {
                httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // Chống tấn công CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });

            // Đặt cookie HTTP-Only cho refreshToken (tùy chọn)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            new Created({ message: 'Đăng ký thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async login(req, res) {
        const { email, password } = req.body;

        const findUser = await modelUser.findOne({ email });

        if (!findUser) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác !!!');
        }

        const result = await bcrypt.compare(password, findUser.password);

        if (!result) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác !!!');
        }
        if (result) {
            await createApiKey(findUser._id);
            const token = await createToken({ id: findUser._id });
            const refreshToken = await createRefreshToken({ id: findUser._id });
            res.cookie('token', token, {
                httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // Chống tấn công CSRF
                maxAge: 15 * 60 * 1000, // 15 phút
            });

            res.cookie('logged', 1, {
                httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
                secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
                sameSite: 'Strict', // Chống tấn công CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });

            // Đặt cookie HTTP-Only cho refreshToken (tùy chọn)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async authUser(req, res) {
        const user = req.user;
        const findUser = await modelUser.findOne({ _id: user.id });
        if (!findUser) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác');
        }
        const userString = JSON.stringify(findUser);
        const auth = CryptoJS.AES.encrypt(userString, process.env.SECRET_CRYPTO).toString();
        new OK({ message: 'success', metadata: { auth } }).send(res);
    }

    async refreshToken(req, res) {
        const refreshToken = req.cookies.refreshToken;
        const decoded = await verifyToken(refreshToken);
        const user = await modelUser.findById(decoded.id);
        const token = await createToken({ id: user._id });
        res.cookie('token', token, {
            httpOnly: true, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 15 * 60 * 1000, // 15 phút
        });

        res.cookie('logged', 1, {
            httpOnly: false, // Chặn truy cập từ JavaScript (bảo mật hơn)
            secure: true, // Chỉ gửi trên HTTPS (để đảm bảo an toàn)
            sameSite: 'Strict', // Chống tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });

        new OK({ message: 'Refresh token thành công', metadata: { token } }).send(res);
    }

    async logout(req, res) {
        const { id } = req.user;
        await modelApiKey.deleteOne({ userId: id });
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        res.clearCookie('logged');

        new OK({ message: 'Đăng xuất thành công' }).send(res);
    }

    async updateUser(req, res) {
        const { id } = req.user;
        const { fullName, phone, address } = req.body;
        const updateUser = await modelUser.findByIdAndUpdate(id, { fullName, phone, address }, { new: true });
        if (!updateUser) {
            throw new BadRequestError('Cập nhật thông tin thất bại');
        }
        new OK({ message: 'Cập nhật thông tin thành công' }).send(res);
    }

    async updatePassword(req, res) {
        const { id } = req.user;
        const { oldPassword, newPassword } = req.body;
        const findUser = await modelUser.findById(id);
        if (!findUser) {
            throw new BadRequestError('Tài khoản không tồn tại');
        }
        const result = await bcrypt.compare(oldPassword, findUser.password);
        if (!result) {
            throw new BadRequestError('Mật khẩu cũ không chính xác');
        }
        const saltRounds = 10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const passwordHash = bcrypt.hashSync(newPassword, salt);
        const updateUser = await modelUser.findByIdAndUpdate(id, { password: passwordHash }, { new: true });
        if (!updateUser) {
            throw new BadRequestError('Cập nhật mật khẩu thất bại');
        }
        new OK({ message: 'Cập nhật mật khẩu thành công' }).send(res);
    }

    async uploadAvatar(req, res, next) {
        const { id } = req.user;
        const file = req.file;
        if (!file) {
            throw new BadRequestError('Vui lòng chọn ảnh đại diện');
        }
        const findUser = await modelUser.findById(id);
        if (findUser.avatar === 'https://cdn-icons-png.flaticon.com/512/6596/6596121.png') {
            const result = await cloudinary.uploader.upload(file.path);
            await fs.unlink(file.path);
            const updateUser = await modelUser.findByIdAndUpdate(id, { avatar: result.secure_url }, { new: true });
            if (!updateUser) {
                throw new BadRequestError('Cập nhật ảnh đại diện thất bại');
            }
            new OK({ message: 'Cập nhật ảnh đại diện thành công' }).send(res);
        } else {
            const publicId = getPublicId(findUser.avatar);
            await cloudinary.uploader.destroy(publicId);
            const result = await cloudinary.uploader.upload(file.path);
            await fs.unlink(file.path);
            const updateUser = await modelUser.findByIdAndUpdate(id, { avatar: result.secure_url }, { new: true });
            if (!updateUser) {
                throw new BadRequestError('Cập nhật ảnh đại diện thất bại');
            }
            new OK({ message: 'Cập nhật ảnh đại diện thành công' }).send(res);
        }
    }

    async getUsers(req, res) {
        const users = await modelUser.find();
        new OK({ message: 'Lấy danh sách người dùng thành công', metadata: users }).send(res);
    }

    async updateRoleUser(req, res) {
        const { userId, role } = req.body;
        const updateUser = await modelUser.findByIdAndUpdate(
            { _id: userId },
            { role: role === '1' ? 'admin' : 'user' },
            { new: true },
        );
        if (!updateUser) {
            throw new BadRequestError('Cập nhật vai trò người dùng thất bại');
        }
        new OK({ message: 'Cập nhật vai trò người dùng thành công' }).send(res);
    }

    async getDashboard(req, res) {
        try {
            const { startDate, endDate } = req.query;

            // Prepare date filters
            const dateFilter = {};
            if (startDate) {
                dateFilter.createdAt = { $gte: new Date(startDate) };
            }
            if (endDate) {
                dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate + 'T23:59:59.999Z') };
            }

            // 1. Get statistics
            const [totalUsers, totalProducts, totalRevenue, totalWatching] = await Promise.all([
                mongoose.model('users').countDocuments(),
                mongoose.model('products').countDocuments(),
                mongoose
                    .model('payments')
                    .aggregate([
                        { $match: { status: { $in: ['completed', 'delivered'] }, ...dateFilter } },
                        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
                    ])
                    .then((result) => (result.length > 0 ? result[0].total : 0)),
                mongoose.model('viewProduct').countDocuments(),
            ]);

            // 2. Get recent orders
            const recentOrders = await mongoose
                .model('payments')
                .find(dateFilter)
                .sort({ createdAt: -1 })
                .limit(5)
                .select('_id userId fullName totalPrice status paymentMethod createdAt')
                .lean();

            // 3. Get top products
            const topProducts = await mongoose.model('payments').aggregate([
                { $match: { status: { $in: ['completed', 'delivered'] }, ...dateFilter } },
                { $unwind: '$product' },
                {
                    $group: {
                        _id: '$product.productId',
                        quantity: { $sum: '$product.quantity' },
                    },
                },
                { $sort: { quantity: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails',
                    },
                },
                { $unwind: '$productDetails' },
                {
                    $project: {
                        id: '$_id',
                        name: '$productDetails.nameProduct',
                        price: '$productDetails.price',
                        category: '$productDetails.category',
                        quantity: 1,
                        stock: '$productDetails.stock',
                    },
                },
            ]);

            // 4. Get order stats
            // Determine date range
            let startDateForStats = new Date();
            let endDateForStats = new Date();

            if (startDate && endDate) {
                // Use user-selected date range
                startDateForStats = new Date(startDate);
                endDateForStats = new Date(endDate);
            } else {
                // Default: last 7 days
                endDateForStats = new Date();
                startDateForStats = new Date(endDateForStats);
                startDateForStats.setDate(startDateForStats.getDate() - 6);
            }

            // Generate array of all dates in the range
            const dates = [];
            const currentDate = new Date(startDateForStats);

            // Calculate days difference
            const daysDifference = Math.ceil((endDateForStats - startDateForStats) / (1000 * 60 * 60 * 24)) + 1;

            // Generate all dates in range
            for (let i = 0; i < daysDifference; i++) {
                const date = new Date(currentDate);
                dates.push(date.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const ordersByDate = await mongoose.model('payments').aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startDateForStats,
                            $lte: new Date(endDateForStats.getTime() + 24 * 60 * 60 * 1000 - 1),
                        },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]);

            // Fill in missing dates
            const orderStats = dates.map((date) => {
                const found = ordersByDate.find((item) => item._id === date);
                return { date, count: found ? found.count : 0 };
            });

            // 5. Get category stats
            const categoryStats = await mongoose.model('products').aggregate([
                {
                    $group: {
                        _id: '$category',
                        value: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        type: '$_id',
                        value: 1,
                        name: '$_id',
                        _id: 0,
                    },
                },
            ]);
            const categoryWithNames = await Promise.all(
                categoryStats.map(async (cat) => {
                    console.log(cat);

                    const category = await modelCategory.findById(cat.type);
                    return {
                        ...cat,
                        name: category.nameCategory || 'Không xác định',
                    };
                }),
            );

            // 6. Get order status stats
            const orderStatusStats = await mongoose.model('payments').aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$status',
                        value: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        status: '$_id',
                        value: 1,
                        name: '$_id',
                        _id: 0,
                    },
                },
            ]);

            // Format status names for better display
            const statusMapping = {
                pending: 'Đang chờ xử lý',
                completed: 'Hoàn thành',
                delivered: 'Đã giao',
                cancelled: 'Đã hủy',
            };

            const statusWithNames = orderStatusStats.map((stat) => ({
                ...stat,
                name: statusMapping[stat.status] || stat.status,
            }));

            return res.status(200).json({
                status: 'success',
                code: 200,
                metadata: {
                    statistics: {
                        totalUsers,
                        totalProducts,
                        totalRevenue,
                        totalWatching,
                    },
                    recentOrders: recentOrders.map((order) => ({
                        id: order._id,
                        idPayment: order._id,
                        fullName: order.fullName,
                        totalPrice: order.totalPrice,
                        status: order.status,
                        typePayment: order.paymentMethod,
                    })),
                    topProducts,
                    orderStats: orderStats,
                    categoryStats: categoryWithNames,
                    orderStatusStats: statusWithNames,
                },
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            return res.status(500).json({
                status: 'error',
                code: 500,
                message: 'Internal Server Error',
            });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                throw new BadRequestError('Vui lòng nhập email');
            }

            const user = await modelUser.findOne({ email });
            if (!user) {
                throw new BadRequestError('Email không tồn tại');
            }

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const otp = await otpGenerator.generate(6, {
                digits: true,
                lowerCaseAlphabets: false,
                upperCaseAlphabets: false,
                specialChars: false,
            });

            const saltRounds = 10;

            const hash = await bcrypt.hash(otp, saltRounds);

            await modelOtp.create({
                email: user.email,
                otp: hash,
            });
            await sendMailForgotPassword(email, otp);

            return res
                .setHeader('Set-Cookie', [`tokenResetPassword=${token};  Secure; Max-Age=300; Path=/; SameSite=Strict`])
                .status(200)
                .json({ message: 'Gửi thành công !!!' });
        } catch (error) {
            console.error('Error forgot password:', error);
            return res.status(500).json({ message: 'Có lỗi xảy ra' });
        }
    }

    async resetPassword(req, res) {
        try {
            const token = req.cookies.tokenResetPassword;
            const { otp, newPassword } = req.body;

            if (!token) {
                throw new BadRequestError('Vui lòng gửi yêu cầu quên mật khẩu');
            }

            const decode = jwt.verify(token, process.env.JWT_SECRET);
            if (!decode) {
                throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
            }

            const findOTP = await modelOtp.findOne({
                email: decode.email,
            });
            if (!findOTP) {
                throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
            }

            // So sánh OTP
            const isMatch = await bcrypt.compare(otp, findOTP.otp);
            if (!isMatch) {
                throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
            }

            // Hash mật khẩu mới
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            // Tìm người dùng
            const findUser = await modelUser.findOne({ email: decode.email });
            if (!findUser) {
                throw new BadRequestError('Người dùng không tồn tại');
            }

            // Cập nhật mật khẩu mới
            findUser.password = hashedPassword;
            await findUser.save();

            // Xóa OTP sau khi đặt lại mật khẩu thành công
            await modelOtp.deleteOne({ email: decode.email });
            res.clearCookie('tokenResetPassword');
            return res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng liên hệ ADMIN !!' });
        }
    }

    async importUser(req, res) {
        try {
            // ===== 1. Kiểm tra file upload =====
            if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel/CSV để nhập' });
            }

            const nameLower = (req.file.originalname || '').toLowerCase();
            const allowName = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || nameLower.endsWith('.csv');
            if (!allowName) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ success: false, message: 'Định dạng không hợp lệ, vui lòng dùng .xlsx, .xls hoặc .csv' });
            }

            // ===== 2. Đọc sheet =====
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames?.[0];
            if (!sheetName) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ success: false, message: 'Không tìm thấy sheet dữ liệu trong file' });
            }
            const sheet = workbook.Sheets[sheetName];
            let rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            console.log("check row", rows)
            

            // ===== 3. Chuẩn hóa dữ liệu =====
            rows = rows.map((r, idx) => {
                return ({
            rowNum: idx + 2,
            fullName: (r.fullName ?? r['fullName'] ?? '').toString().trim(),
            email: (r.email ?? r['email'] ?? '').toString().trim().toLowerCase(),
            password: (r.password ?? r['password'] ?? '').toString(),
            phone: (r.phone ?? r['phone'] ?? '').toString().trim(),
            role: r.role === 'Thủ thư' ? 'admin' : r.role,
            class:  (r.class ?? r['class'] ?? '').toString().trim().toLowerCase(),
            avatar: (r.avatar ?? r['avatar'] ?? 'https://cdn-icons-png.flaticon.com/512/6596/6596121.png')
                .toString()
                .trim(),
            address: (r.address ?? r['address'] ?? '').toString().trim(),
            })
            });

            // ===== 4. Kiểm tra dữ liệu hợp lệ =====
            const invalidRows = [];
            const candidates = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            for (const r of rows) {
            const errs = [];
            if (!r.fullName) errs.push('fullName trống');
            if (!r.email) errs.push('email trống');
            if (!r.password) errs.push('password trống');
            if (!r.phone) errs.push('phone trống');
            if (!r.address) errs.push('address trống');
            if (r.email && !emailRegex.test(r.email)) errs.push('email không hợp lệ');
            if (errs.length) invalidRows.push({ row: r.rowNum, email: r.email, reasons: errs });
            else candidates.push(r);
            }

            if (candidates.length === 0) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({
                success: false,
                message: 'Không có dòng hợp lệ để nhập',
                metadata: { invalidRows },
            });
            }

            // ===== 5. Kiểm tra email trùng =====
            const emails = candidates.map((c) => c.email);
            const existed = await modelUser.find({ email: { $in: emails } }, { email: 1 }).lean();
            const existedSet = new Set(existed.map((e) => e.email));

            const duplicates = [];
            const toInsert = [];
            for (const c of candidates) {
            if (existedSet.has(c.email)) {
                duplicates.push({ row: c.rowNum, email: c.email });
                continue;
            }

            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync(c.password, salt);

            toInsert.push({
                fullName: c.fullName,
                email: c.email,
                password: passwordHash,
                phone: c.phone,
                class:c.class,
                role: c.role === 'Thủ thư' ? 'admin' : c.role === "Học sinh" ? 'student' : 'teacher',
                avatar: c.avatar || 'https://cdn-icons-png.flaticon.com/512/6596/6596121.png',
                address: c.address,
            });
            }

            // ===== 6. Insert user mới =====
            let inserted = [];
            if (toInsert.length > 0) {
            inserted = await modelUser.insertMany(toInsert, { ordered: false });
            await Promise.all(inserted.map((u) => createApiKey(u._id).catch(() => null)));
            }

            await fs.unlink(req.file.path).catch(() => {});

            // ===== 7. Trả kết quả JSON hợp lệ =====
            return res.status(200).json({
            message: 'Nhập người dùng thành công',
            statusCode: 200,
            metadata: {
                totalRows: rows.length,
                insertedCount: inserted.length,
                duplicateCount: duplicates.length,
                invalidCount: invalidRows.length,
                duplicates,
                invalidRows,
                sampleInserted: inserted.slice(0, 5).map((u) => ({
                id: u._id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                })),
            },
            });
        } catch (err) {
            console.error('importUser error:', err);
            if (req?.file?.path) {
            try { await fs.unlink(req.file.path); } catch {}
            }

            // Trả JSON hợp lệ dù lỗi gì
            return res.status(500).json({
            success: false,
            message: err.message || 'Có lỗi xảy ra khi nhập file',
            });
        }
    }

}

module.exports = new usersController();
