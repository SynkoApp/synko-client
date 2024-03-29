let express = require('express');
let fs = require('fs');
let path = require('path');
let router = express.Router();
const cors = require('cors')

module.exports = {
    handler(app) {
        router.use(express.json())
        router.use(cors())
        router.use((req, res, next) => {
            if(app.disabled_routes.includes(`/admin${req.path}@${req.method.toLowerCase()}`)) return res.status(401).json({message: "This endpoint is temporarily disabled"})
            if(["/auth/login"].includes(req.path)) next();
            else {
                if(req.headers.authorization) {
                    if(app.isAdmin(app.tokenToID(req.headers.authorization))) {
                        next();
                    } else return res.status(401).json({message: "Not admin or invalid token provided"});
                } else return res.status(403).json({message: "No token provided"});                
            }

        });

        fs.readdir(path.resolve(__dirname, './routes/'), (err, files) => {
            if(err) throw new Error(err);
            files.forEach(f => {
                let route = require(`./routes/${f}`);
                route.run(router, app);
            });
        });
        return router;
    },
    path: "/admin"
}