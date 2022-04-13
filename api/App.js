const Functions = require('./Functions');
const express = require('express');
const app = express();
const colors = require('colors');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const AdminRouter = require('./admin/Router');
const BaseRouter = require('./base/Router')

module.exports = class App extends Functions {
    constructor(props) {
        super(props);
        this.disabled_routes = [];
        this.adminRouter = AdminRouter.handler(this)
        this.baseRouter = BaseRouter.handler(this)
    }

    run(port) {
        app.use(AdminRouter.path, this.adminRouter);
        app.use(BaseRouter.path, this.baseRouter)
        app.use(cors())
        app.use(fileUpload())
        app.use('/files', express.static('./files/'));
        app.listen(port, () => {
            console.info(colors.cyan(`> Serveur connecté sur le port ${port}`));
        });
    }
}