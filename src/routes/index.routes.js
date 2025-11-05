const usersRoutes = require('./users.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const paymentsRoutes = require('./payments.routes');
const viewProductRoutes = require('./viewProduct.routes');

function routes(app) {
    app.use('/api/users', usersRoutes);
    app.use('/api/category', categoryRoutes);
    app.use('/api/product', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/payments', paymentsRoutes);
    app.use('/api/view-product', viewProductRoutes);
}

module.exports = routes;
