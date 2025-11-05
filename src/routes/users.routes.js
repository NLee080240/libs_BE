const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');
const usersController = require('../controllers/users.controller');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = 'src/uploads/avatars';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/avatars');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
// =====================
// Excel import
// =====================
const excelStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/excel');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
var upload = multer({ storage: storage });
const uploadExcel = multer({ storage: excelStorage });

router.post('/register', asyncHandler(usersController.register));
router.post('/login', asyncHandler(usersController.login));
router.post('/auth', authUser, asyncHandler(usersController.authUser));
router.post('/refresh-token', asyncHandler(usersController.refreshToken));
router.post('/logout', authUser, asyncHandler(usersController.logout));
router.post('/update', authUser, asyncHandler(usersController.updateUser));
router.post('/update-password', authUser, asyncHandler(usersController.updatePassword));
router.post('/upload-avatar', authUser, upload.single('avatar'), asyncHandler(usersController.uploadAvatar));
router.post('/forgot-password', asyncHandler(usersController.forgotPassword));
router.post('/reset-password', asyncHandler(usersController.resetPassword));

router.get('/get-users', authUser, asyncHandler(usersController.getUsers));
router.post('/update-role-user', authUser, asyncHandler(usersController.updateRoleUser));
router.get('/get-dashboard', authUser, asyncHandler(usersController.getDashboard));
router.post(
    '/import-user',
    authAdmin, 
    uploadExcel.single('file'),
    asyncHandler(usersController.importUser)
);
router.get('/admin', authAdmin, (req, res) => {
    return res.status(200).json({ ok: true });
});

module.exports = router;
