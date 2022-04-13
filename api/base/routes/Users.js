module.exports =  {
  run(router, app){
    router.post(this.path, (req, res) => {
      let { query } = req.body
      let id = app.tokenToID(req.headers.authorization)
      let usersArr = [];
      if(!id) return res.status(403).json({message : "Invalid token provided"})
      if(query){
          app.db.users.all().forEach(user => {
              let { username, profilePic } = app.db.users.get(`${user.ID}`);
              if(username.toLowerCase().startsWith(query.toLowerCase())){
                  if(user.ID == id) return
                  usersArr.push({username, profilePic, id : user.ID})
              }
          })
          res.status(200).json({message : "Success", users:usersArr, code:"SUCCESS"})
      } else return res.status(401).json({message : "Empty query", code : "UNAUTHORIZED"}) 
    })

    router.route(this.path+'/@me')
      .get((req, res) => {
        if(req.headers.authorization){
          let token = req.headers.authorization;
          token = app.decrypt(token).split('.')
          let username = token[0]
          if(username && !app.checkUsernameAvailability(username).available && app.decrypt(app.checkUsernameAvailability(username).userData.password) == token[1]){
              let user = app.checkUsernameAvailability(username);
              res.json({
                  username: user.userData.username,
                  email: user.userData.email,
                  profilePic: user.userData.profilePic,
                  status: app.getStatus(user.uuid),
                  permissions: user.userData.permissions
              })
          } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})
        } else return res.status(401).json({message: "Unauthorized", code: 'UNAUTHORIZED'});
      })
      .patch((req, res) => {
        if(req.headers.authorization){
          let id = app.tokenToID(req.headers.authorization)
          let password = req.body.user.username ? req.body.password : app.decrypt(req.headers.authorization).split('.')[1]
          if(id && app.db.users.has(`${id}`)){
              if(app.decrypt(req.headers.authorization).split('.')[1] == password){
                  Object.keys(req.body.user).forEach(prop => {
                    app.db.users.set(`${id}.${prop}`, `${req.body.user[prop]}`);
                  });
                  let username = app.db.users.get(`${id}.username`)
                  res.status(200).json({message: "Success", token: app.encryptor.AES.encrypt(`${username}.${password}`, app.env.KEY).toString()})
              } else return res.status(401).json({message: "Wrong credentials", code: 'UNAUTHORIZED'});
          } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})
        } else return res.status(401).json({message: "Unauthorized", code: 'UNAUTHORIZED'});
      })
  },
  path: "/users"
}