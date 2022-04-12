module.exports = {
    run(router, app) {
        router.route('/users')
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
            });

        router.param('id', (req, res, next, id) => {
            if(app.db.users.has(`${id}`)) next(); 
            else return res.status(404).json({message: "User not found"});
        });

        router.route('/users/:id')
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
            .patch((req, res) => {
                app.db.users.set(`${req.params.id}.banned`, '0');
                return res.status(202).json({message: "Done"})
            })

    }
}