const Functions = require('./Functions');
const express = require('express');
const app = express();
const colors = require('colors')

const AdminRouter = require('./admin/Router');

module.exports = class App extends Functions {
    constructor(props) {
        super(props);
    }

    run(port) {
        app.use(AdminRouter.path, AdminRouter.handler(this));

        app.listen(port, () => {
            console.info(colors.cyan(`> Serveur connecté sur le port ${port}`));
        });
    }
}