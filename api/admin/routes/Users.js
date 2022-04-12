module.exports = {
    run(router, app) {
        router.route(this.path)
            // Get all users
            .get((req, res) => {
                let usersArr = []
                app.db.users.all().forEach(user => {
                    let data;
                    try {
                        data = JSON.parse(user.data)   
                    } catch {
                        data = user.data
                    }
                    usersArr.push({
                        ID : user.ID,
                        name : data.username,
                        mail : data.email,
                        profile_pic : data.profilePic,
                        groups : data.groups,
                        perms : data.permissions,
                        banned : data.banned == "1" ? "Yes" : "No",
                        badges: data.badges || []
                    })
                });
                return res.status(200).json({users : usersArr})
            })
            // Create new user
            .post((req, res) => {
                let { username, email, password, permissions } = req.body
                if(checkUsernameAvailability(username).available){
                    if(checkEmailAvailability(email) && app.validator.isEmail(email)){
                        users.set(uuidv4(), {
                            username,
                            email,
                            profilePic : "",
                            password : app.encryptor.AES.encrypt(password, key).toString(),
                            groups : [],
                            permissions
                        })
                        res.status(204).json({message: "Successfully created"})
                    } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"})
                } else return res.status(403).json({message: "Unavailable username", code: "FORBIDDEN"})
            });

        router.param('id', (req, res, next, id) => {
            if(app.db.users.has(`${id}`)) next(); 
            else return res.status(404).json({message: "User not found"});
        });

        router.route(this.path + '/:id')
            // Delete user
            .delete((req, res) => {
                app.db.users.set(`${req.params.id}.banned`, '1');
                onlineUsers.forEach(u => {
                    if(u.uid == req.params.id) {
                        u.ws.send(JSON.stringify({
                            type: "admin_disconnect",
                        }));
                    }
                });
                return res.status(202).json({message: "Done"})
            })
            // Ban user
            .patch((req, res) => {
                app.db.users.set(`${req.params.id}.banned`, '0');
                return res.status(202).json({message: "Done"})
            })
            // Update user
            .put((req, res) => {
                Object.keys(req.body.user).forEach(prop => {
                    users.set(`${req.params.id}.${prop}`, req.body.user[prop]);
                });
                return res.status(202).json({message: "Done"})
            });

        // Disconnect user
        router.post(this.path + '/disconnect/:id', (req, res) => {
            app.onlineUsers.forEach(u => {
                if(u.uid == req.params.id) {
                    u.ws.send(JSON.stringify({
                        type: "admin_disconnect",
                    }));
                }
            });
            return res.status(202).json({message: "Done"})
        })

        // Get online users
        router.get(this.path + '/online', (req, res) => {
            let online = []
                app.onlineUsers.forEach(u => {
                    online.push(Object.assign(app.db.users.get(u.uid), {id: u.uid, date: u.date, version: u.version}))
                });
                res.status(200).json({message: "Success", users: online})
        })
    },
    path: "/users"
}