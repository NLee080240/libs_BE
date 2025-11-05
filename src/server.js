const express = require('express');
const app = express();
const port = 3000;

const connectDB = require('./config/connectDB');
const routes = require('./routes/index.routes');

const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');

connectDB();

app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true,
    }),
);


routes(app);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi server !',
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
