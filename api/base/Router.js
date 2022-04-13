let express = require('express');
let fs = require('fs');
let path = require('path');
let router = express.Router();
const cors = require('cors')


module.exports = {
    handler(app) {
        router.use(cors())
        router.use(express.json())
        router.use((req, res, next) => {
            if(app.disabled_routes.includes(`${req.path}@${req.method.toLowerCase()}`)) return res.status(401).json({message: "This endpoint is temporarily disabled"})
            else return next()
        })

        fs.readdir(path.resolve(__dirname, './routes/'), (err, files) => {
            if(err) throw new Error(err);
            files.forEach(f => {
                let route = require(`./routes/${f}`);
                route.run(router, app);
            });
        });

        return router;
    },
    path: "/"
}