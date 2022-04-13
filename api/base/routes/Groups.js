module.exports = {
  run(router, app){
    router.route(this.path)
      .get((req, res) => {
        if(req.headers.authorization){
          let id = app.tokenToID(req.headers.authorization)
          if(!app.db.users.has(`${id}.groups`)) return res.status(401).json({message : "Invalid token provided"})
          let _groups = app.db.users.get(`${id}.groups`);
          let formatted_groups = []
          _groups.forEach(group => {
              let db_group = app.db.groups.get(`${group}`)
              if(!db_group) return
              formatted_groups.push({
                  id : db_group.id,
                  name : db_group.name,
                  avatar : db_group.avatar,
                  owner: db_group.owner
              })
          })
          res.status(200).json({groups : formatted_groups})
        } else return res.status(401).json({message : "Invalid token provided"})
      })
      .post((req, res) => {
        let { body } = req;
        if(!app.decrypt(body.owner)) return res.status(401).json({message : "Invalid token provided"})
        let ownerId = app.tokenToID(body.owner)
        if(!app.db.users.get(`${ownerId}`)) return res.status(401).json({message : "Invalid token provided"})
        if(app.db.users.get(`${ownerId}.groups`).length == 10) return res.status(401).json({message: "You can't create more group"});
        if(body?.users){
            let group = {
                id : Math.floor(Math.random()*2147548652),
                name : body.name,
                avatar : body.avatar,
                participants : [],
                messages : [],
                owner: ownerId
            }
            body.users.forEach(user => {
                let DB_User = app.db.users.get(`${user.id}`)
                if(DB_User) group.participants.push({id : user.id, permissions : 0})
                DB_User.groups.push(group.id)
                app.db.users.set(`${user.id}`, DB_User)
                app.onlineUsers.forEach(u => {
                    if(u.uid == user.id) {
                        u.ws.send(JSON.stringify({
                            type: "new_group",
                            group
                        }));
                    }
                });
            })
            let owner = app.db.users.get(`${ownerId}`)
            if(owner) group.participants.push({id : ownerId, permissions : 1})
            owner.groups.push(group.id);
            app.db.users.set(`${ownerId}`, owner)
            app.db.groups.set(`${group.id}`, group)
            res.status(200).json({message : "GROUP_CREATED", group_id : group.id})
        }
      })
  },
  path: "/groups"
}