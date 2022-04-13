const { v4: uuidv4 } = require('uuid');
module.exports =  {
  run(router, app){

      // Check user token
      router.post(this.path+"/check", (req, res) => {
        if(req.body.username && req.body.token){
          let { username, token } = req.body
          token = app.decrypt(token).split('.')
          let user = app.checkUsernameAvailability(username)
          if(user.userData.banned == "1") return res.status(403).json({message : "Banned user", code : 'FORBIDDEN'})
          if(token[0] == username && !user.available && app.decrypt(user.userData.password) == token[1]){
              res.status(200).json({message : "Valid token", code : 'OK'})
          } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})
        } else return res.status(401).json({message: "Missing data", code: "UNAUTHORIZED"});
      })

      // User login
      router.post(this.path+"/login", (req, res) => {
        if(req.body.username && req.body.password){
          let { username, password } = req.body
          if(app.checkUsernameAvailability(username).available){
             return res.status(404).json({message : "Username doesn't exist", code : "NOT_FOUND"})
          }
          let isGood = false
          app.db.users.all().forEach(user => {
              let data = app.db.users.get(`${user.ID}`)
              if(data.username == username && app.decrypt(data.password) == password){
                  if(data.banned == "1") return res.status(403).json({message : "Banned user", code : "FORBIDDEN"})
                  isGood = true
                  return res.status(200).json({message : "Valid credentials, user can be logged", code : "OK", id : user.ID, token : app.encryptor.AES.encrypt(`${username}.${password}`, app.env.KEY).toString()})
              } else return 
          })
          if(isGood == false) return res.status(403).json({message : "Invalid credentials", code : "FORBIDDEN"})
        } else return res.status(401).json({message : "Missing data", code : "UNAUTHORIZED"})
      })

      router.post(this.path+"/register", (req, res) => {
        if(req.body.email && req.body.username && req.body.password){
          let { email, username, password } = req.body
          if(app.checkUsernameAvailability(username).available){
              if(app.checkEmailAvailability(email) && app.validator.isEmail(email)){
                  app.db.users.set(uuidv4(), {
                      username,
                      email,
                      profilePic : "",
                      password : app.encryptor.AES.encrypt(password, app.env.KEY).toString(),
                      groups : [],
                      permissions : 0 // Must be 0 (1 is for admins)
                  })
                  res.status(200).json({message: "Successfully registered", code: "OK"})
              } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"})
          } else return res.status(403).json({message: "Unavailable username", code: "FORBIDDEN"})
        } else return res.status(401).json({message: "Missing data", code: "UNAUTHORIZED"})
      })

      router.route(this.path+"/password")
        // Forgot Password
        .post((req, res) => {
          let { body } = req;
          if(body.email) {
              if(!app.checkEmailAvailability(body.email) && app.validator.isEmail(body.email)) {
                  let user = app.getUserFromEmail(body.email);
                  if(app.db.users.has(`${user.id}.forgot`)) {
                    let timestamp = parseInt(users.get(`${user.id}.forgot.timestamp`));
                    if((Date.now()-timestamp) > 600000) {
                      app.db.users.delete(`${user.id}.forgot`);
                      app.forgotPassword(user).then((digit) => {
                        app.db.users.set(`${user.id}.forgot`, {
                          digit,
                          timestamp: Date.now()
                        });
                        return res.status(202).json({message: "Email sent"});
                      }).catch((err) => {
                        console.log(err)
                        return res.status(502).json({message: "An error occured"})
                      });
                    } else return res.status(401).json({message: "You already have a pending request"})
                  } else {
                    app.forgotPassword(user).then(digit => {
                      app.db.users.set(`${user.id}.forgot`, {
                        digit,
                        timestamp: Date.now()
                      });
                      return res.status(202).json({message: "Email sent"});
                    }).catch((err) => {
                      console.log(err)
                      return res.status(502).json({message: "An error occured"})
                    });
                  }
              } else res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"});
          } else return res.status(400).json({message: "No email provided."});
        })
        // Update password
        .put((req, res) => {
          let { body } = req;
          if(body.email && body.digit && body.password) {
            if(!app.checkEmailAvailability(body.email) && app.validator.isEmail(body.email)) {
              let digit = parseInt(body.digit);
              if(!app.isDigit(digit)) return res.status(403).json({message: "Invalid digit", code: "FORBIDDEN"});
              let user = app.getUserFromEmail(body.email);
              if(app.db.users.has(`${user.id}.forgot`)) {
                if(app.db.users.get(`${user.id}.forgot.digit`) !== digit) return res.status(401).json({message: "Invalid digit"});
                let timestamp = parseInt(users.get(`${user.id}.forgot.timestamp`));
                if((Date.now()-timestamp) > 600000) {
                  app.db.users.delete(`${user.id}.forgot`);
                  return res.status(401).json({message: "The 6-digit expired"})
                } else {
                  app.db.users.delete(`${user.id}.forgot`);
                  app.db.users.set(`${user.id}.password`, `${app.encryptor.AES.encrypt(body.password, app.env.KEY).toString()}`);
                  return res.status(202).json({message: "Password changed"});
                }
              } else return res.status(401).json({message: "No request is pending"})
            } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"});
          } else return res.status(400).json({message: "No email, digit or password provided."});
        })

  },
  path: "/auth"
}