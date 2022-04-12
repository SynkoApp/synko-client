module.exports =  {
    run(router, app){

        // Check admin token
        router.post(this.path+"/check", (req, res) => {
            if(req.headers.authorization){
                let id = app.tokenToID(req.headers.authorization)
                if(app.db.users.get(`${id}.permissions`) == "1") return res.status(200).json({message: "Admin token"})
                else return res.status(401).json({message: "User or invalid token"})
            } else return res.status(401).json({message: "No token provided"}) ;
        })

        // Admin login
        router.post(this.path+"/login", (req, res) => {
            if(!req.body.password || !req.body.username) return res.status(401).json({message: "Missing data"})
            let id = app.tokenToID(app.encryptor.AES.encrypt(`${req.body.username}.${req.body.password}`, app.env.KEY))
            if(id){
                if(app.db.users.get(`${id}.permissions`) == "1") return res.status(200).json({message: "Valid admin credentials", tkn : app.encryptor.AES.encrypt(`${req.body.username}.${req.body.password}`, app.env.KEY).toString()})
                else return res.status(401).json({message : "Not admin or invalid credentials"})
            } else return res.status(401).json({message : "Not admin or invalid credentials"})
        })

    },
    path: "/auth"
}