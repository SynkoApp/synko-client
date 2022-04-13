module.exports = {
  run(router, app){
    router.get(this.path+"/:gid", async (req, res) => {
      if(req.headers.authorization){
        let id = app.tokenToID(req.headers.authorization)
        if(!app.db.users.has(`${id}`)) return res.status(401).json({message : "Invalid token provided"})
        if(!req.params.gid) return res.status(400).json({ message: "No group id provided" })
        let group = app.db.groups.has(`${req.params.gid}`);
        if(!group) return res.status(401).json({ message: "Not found" })
        let user_group = app.db.users.get(`${id}.groups`).find(g => g == req.params.gid);
        if(!user_group) return res.status(401).json({ message: "Not found" })
        let messages = app.db.groups.get(`${user_group}.messages`);
        let users_group = [];
        for (let i = 0; i < messages.length; i++) {
          if(messages[i].attachments) messages[i].attachments = messages[i].attachments.length;
          let links = app.getAllValidesUrls(messages[i].content);
          if(links.length > 0) {
            for (let j = 0; j < links.length; j++) {
              messages[i].links = []
              let url = links[j];
              const response = await fetch(`https://api.synko.kunah.fr/proxy/m?url=${encodeURIComponent(url)}`);
              const data = await response.json();
              if(data.error) return;
              Object.assign(data.meta, data.og);
              data.meta.site = url
              messages[i].links.push(data.meta)
            }
          }
        }
        let participants = groups.get(`${user_group}.participants`);
        participants.forEach(p => {
          let user = users.get(`${p.id}`);
          let badges = user?.badges || [];
          if(typeof badges == "string") badges = badges.split(',');
          if(user?.permissions == 1) badges.push("admin");
          if(user?.banned == 1) badges.push("banned");
          users_group.push({
            username: user?.username || "Deleted_User",
            profilePic: user?.profilePic || "https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png",
            id: p.id,
            group_permission: p.permissions || 0,
            badges
          });
        });
        res.json({ users: users_group, messages })
      } else return res.status(401).json({message : "Invalid token provided"})
    })

    router.get(this.path+"/attachments/:gid/:mid/:aid", (req, res) => {
      if(req.params.gid && req.params.mid && req.params.aid) {
        let { gid, mid, aid } = req.params;
        if(app.db.groups.has(`${gid}`)) {
          let groupMessages = app.db.groups.get(`${gid}.messages`);
          let msg = groupMessages.find(m => m.id == mid);
          if(msg && msg.attachments && app.validator.isInt(aid)) {
            let index = parseInt(aid);
            let attachment = msg.attachments[index-1];
            if(attachment) {
              let base64Data = attachment.src.replace(/^data:image\/(png|jpeg|jpg|webp|gif|jfif|bmp);base64,/, '');
              let img = Buffer.from(base64Data, 'base64');
              res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
              });
              res.end(img);
            } else res.sendStatus(404);
          } else res.sendStatus(404);
        } else res.sendStatus(404);
      } else res.sendStatus(400);
    })
  },
  path: "/messages",
}