module.exports = {
    run(router, app) {
        router.route('/links')
            .get((req, res) => {
                let allLinks = [];
                app.db.links.all().forEach(l => {
                    let obj = {}
                    let data;
                    try {
                        data = JSON.parse(l.data);
                    } catch(e) {
                        data = l.data;
                    }
                    Object.keys(data).forEach(x => {
                        obj[x] = x == "date" 
                            ? new Date(app.db.links.get(`${l.ID}.${x}`)).toLocaleString("fr-FR") 
                            : x == "certifier"
                                ? app.db.users.get(`${app.db.links.get(`${l.ID}.${x}`)}.username`) ? app.db.users.get(`${app.db.links.get(`${l.ID}.${x}`)}.username`) : app.db.links.get(`${l.ID}.${x}`)
                                : app.db.links.get(`${l.ID}.${x}`)
                    })
                    Object.assign(obj, {domain: app.encryptor.enc.Base64.parse(l.ID).toString(app.encryptor.enc.Utf8)})
                    allLinks.push(obj);
                });
                return res.json(allLinks);
            }).post((req, res) => {
                let { domain, aliases, desc, why } = req.body;
                if(!app.getLink(domain) || !aliases.find(a => Boolean(app.getLink(a)))) {
                    app.db.links.set(`${app.encryptor.enc.Base64.stringify(app.encryptor.enc.Utf8.parse(domain))}`, {
                        aliases,
                        desc,
                        why,
                        uses: 0,
                        certifier: app.tokenToID(req.headers.authorization),
                        date: Date.now()
                    });
                    return res.status(204).json({message: "Successfully registered"});
                } else {
                    return res.status(403).json({message: "Domain as already registered"})
                }
            }).patch((req, res) => {
                if(!app.db.users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
                if(!app.getLink(req.body.id) || !req.aliases?.find(a => Boolean(app.getLink(a)))) {
                    Object.keys(req.body.link).forEach(prop => {
                        app.db.links.set(`${app.encryptor.enc.Base64.stringify(app.encryptor.enc.Utf8.parse(req.body.id))}.${prop}`, req.body.link[prop]);
                    });
                    return res.status(204).json({message: "Successfully registered"});
                } else {
                    return res.status(403).json({message: "Domain as already registered"});
                }
            }).delete((req, res) => {
                if(app.db.links.has(`${app.encryptor.enc.Base64.stringify(app.encryptor.enc.Utf8.parse(req.body.id))}`)) {
                    app.db.links.delete(`${app.encryptor.enc.Base64.stringify(app.encryptor.enc.Utf8.parse(req.body.id))}`);
                    return res.status(202).json({message: "Done"});
                } else return res.status(401).json({message: "Url not found"})
            });

        router.get('/links/:id')
    }
}