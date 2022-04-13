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
    }

    run(port) {
        app.use(AdminRouter.path, AdminRouter.handler(this));
        app.use(BaseRouter.path, BaseRouter.handler(this))
        app.use(cors())
        app.use(fileUpload())
        app.use('/files', express.static('./files/'));
        app.listen(port, () => {
            console.info(colors.cyan(`> Serveur connecté sur le port ${port}`));
        });
    }
}