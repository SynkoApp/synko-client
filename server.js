// Created by Kunah and Genoweb

// Requirements (doesn't matter)
//Edit test
const express = require('express')
const app = express()
const cors = require('cors')
const webSocketServer = require('websocket').server;
const http = require('http');
const httpServer = http.createServer();
const colors = require('colors')
const db = require('quick.db');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fileUpload = require('express-fileupload');
const path = require('path');
const UrlParser = require('url-parse');
const fetch = require('node-fetch');
const yaml = require('js-yaml');
const fs = require('fs');
const { parse: HTML } = require('node-html-parser');
const { default: axios } = require('axios');
const { default: validator } = require('validator');
let users = new db.table('users');
let groups = new db.table('groups');
let links = new db.table('links');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({path : "./.env"});
let key = process.env.KEY;
app.use(cors())
app.use(express.json())
app.use(fileUpload())
app.use('/files', express.static('./files/'));
let onlineUsers = new Map();
let webSockets = new Map();
const FILES_STORE = path.join(__dirname, "files/")
const wsServer = new webSocketServer({httpServer, maxReceivedFrameSize:1024*1024*10, maxReceivedMessageSize:1024*1024*10});
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: process.env.SYNKO_EMAIL,
        pass: process.env.SYNKO_PASSWORD
    }
});


/* groups.all().forEach(e => {
    groups.delete(`${e.ID}`)
}) */

/*users.all().forEach(e => {
    users.set(`${e.ID}.badges`, []);
})*/

function isDigit(digit){return/\d{6}/.test(digit);}
if(users.has('undefined')) users.delete('undefined');


//console.log(getLink("youtu.be"))

// Token checking API (POST)
app.post('/checkToken', (req, res) => {
    if(req.body.username && req.body.token){
        let { username, token } = req.body
        token = decrypt(token).split('.')
        let user = checkUsernameAvailability(username)
        if(user.userData.banned == "1") return res.status(403).json({message : "Banned user", code : 'FORBIDDEN'})
        if(token[0] == username && !user.available && decrypt(user.userData.password) == token[1]){
            res.status(200).json({message : "Valid token", code : 'OK'})
        } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})

    } else ;
})

// Register API (POST)
app.post('/register', (req, res) => {
    if(req.body.email && req.body.username && req.body.password){
        let { email, username, password } = req.body
        if(checkUsernameAvailability(username).available){
            if(checkEmailAvailability(email) && validator.isEmail(email)){
                users.set(uuidv4(), {
                    username,
                    email,
                    profilePic : "",
                    password : CryptoJS.AES.encrypt(password, key).toString(),
                    groups : [],
                    permissions : 0 // Must be 0 (1 is for admins)
                })
                res.status(200).json({message: "Successfully registered", code: "OK"})
            } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"})
        } else return res.status(403).json({message: "Unavailable username", code: "FORBIDDEN"})
    } else return res.status(401).json({message: "Missing data", code: "UNAUTHORIZED"})
})

// Login API (POST)
app.post('/login', (req, res) => {
    if(req.body.username && req.body.password){
        let { username, password } = req.body
        if(checkUsernameAvailability(username).available){
           return  res.status(404).json({message : "Username doesn't exist", code : "NOT_FOUND"})
        }
        let isGood = false
        users.all().forEach(user => {
            let data = users.get(`${user.ID}`)
            if(data.username == username && decrypt(data.password) == password){
                if(data.banned == "1") return res.status(403).json({message : "Banned user", code : "FORBIDDEN"})
                isGood = true
                return res.status(200).json({message : "Valid credentials, user can be logged", code : "OK", id : user.ID, token : CryptoJS.AES.encrypt(`${username}.${password}`, key).toString()})
            } else return 
        })
        if(isGood == false) return res.status(403).json({message : "Invalid credentials", code : "FORBIDDEN"})
    } else return res.status(401).json({message : "Missing data", code : "UNAUTHORIZED"})
})

// Searching users API (POST)
app.post('/getUsers', (req, res) => {
    let { query } = req.body
    let id = tokenToID(req.headers.authorization)
    let usersArr = [];
    if(!id) return res.status(403).json({message : "Invalid token provided"})
    let user = users.get(`${id}`)
    if(query){
        users.all().forEach(user => {
            let { username, profilePic } = users.get(`${user.ID}`);
            if(username.toLowerCase().startsWith(query.toLowerCase())){
                if(user.ID == id) return
                usersArr.push({username, profilePic, id : user.ID})
            }
        })
        res.status(200).json({message : "Success", users:usersArr, code:"SUCCESS"})
    } else return res.status(401).json({message : "Empty query", code : "UNAUTHORIZED"}) 
})

app.get('/users/@me', (req, res) => {
    if(req.headers.authorization){
        let token = req.headers.authorization;
        token = decrypt(token).split('.')
        let username = token[0]
        if(username && !checkUsernameAvailability(username).available && decrypt(checkUsernameAvailability(username).userData.password) == token[1]){
            let user = checkUsernameAvailability(username);
            res.json({
                username: user.userData.username,
                email: user.userData.email,
                profilePic: user.userData.profilePic,
                status: getStatus(user.uuid),
                permissions: user.userData.permissions
            })
        } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})
    } else return res.status(401).json({message: "Unauthorized", code: 'UNAUTHORIZED'});
})

app.patch('/users/@me', (req, res) => {
    if(req.headers.authorization){
        let id = tokenToID(req.headers.authorization)
        let password = req.body.user.username ? req.body.password : decrypt(req.headers.authorization).split('.')[1]
        if(id && users.has(`${id}`)){
            if(decrypt(req.headers.authorization).split('.')[1] == password){
                Object.keys(req.body.user).forEach(prop => {
                    users.set(`${id}.${prop}`, `${req.body.user[prop]}`);
                });
                let username = users.get(`${id}.username`)
                res.status(200).json({message: "Success", token: CryptoJS.AES.encrypt(`${username}.${password}`, key).toString()})
            } else return res.status(401).json({message: "Wrong credentials", code: 'UNAUTHORIZED'});
        } else return res.status(403).json({message : "Invalid token", code : 'FORBIDDEN'})
    } else return res.status(401).json({message: "Unauthorized", code: 'UNAUTHORIZED'});
});

app.post('/createGroup', (req, res) => {
    let { body } = req;
    if(!decrypt(body.owner)) return res.status(401).json({message : "Invalid token provided"})
    let ownerId = tokenToID(body.owner)
    if(!users.get(`${ownerId}`)) return res.status(401).json({message : "Invalid token provided"})
    if(users.get(`${ownerId}.groups`).length == 10) return res.status(401).json({message: "You can't create more group"});
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
            let DB_User = users.get(`${user.id}`)
            if(DB_User) group.participants.push({id : user.id, permissions : 0})
            DB_User.groups.push(group.id)
            users.set(`${user.id}`, DB_User)
            onlineUsers.forEach(u => {
                if(u.uid == user.id) {
                    u.ws.send(JSON.stringify({
                        type: "new_group",
                        group
                    }));
                }
            });
        })
        let owner = users.get(`${ownerId}`)
        if(owner) group.participants.push({id : ownerId, permissions : 1})
        owner.groups.push(group.id);
        users.set(`${ownerId}`, owner)
        groups.set(`${group.id}`, group)
        res.status(200).json({message : "GROUP_CREATED", group_id : group.id})
    }
});

app.get('/getGroups', (req, res) => {
    if(req.headers.authorization){
        let id = tokenToID(req.headers.authorization)
        if(!users.has(`${id}.groups`)) return res.status(401).json({message : "Invalid token provided"})
        let _groups = users.get(`${id}.groups`);
        let formatted_groups = []
        _groups.forEach(group => {
            let db_group = groups.get(`${group}`)
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
});

app.get('/proxy/:type', (req, res) => {
    if(!req.query.url) return res.status(400).json({message : "No url provided"});
    switch(req.params.type) {
        case "i":
            axios({
                method: "GET",
                url: `https://proxy.duckduckgo.com/iu/?u=${req.query.url}`,
                responseType: 'arraybuffer'
            }).then(resp => {
                res.set("Content-Type", resp.headers['content-type'] || "image/png");
                res.send(resp.data);
            }).catch(err => {
                res.sendFile(__dirname + '/assets/default.png');
            });
            break;
        case "m":
            axios({
                method: "GET",
                url: `${req.query.url}`,
                headers: {
                    "User-Agent": "Synko Bot"
                }
            }).then(resp => {
                if(!resp.headers['content-type'].includes('text/html')) return res.status(400).json({message : "No url provided"});
                let $ = HTML(resp.data);
                let og = {},
                    meta = {};
                let title = $.querySelector('head title');
                if (title) meta.title = title.text;
                let canonical = $.querySelector('link[rel=canonical]');
                if (canonical) meta.url = canonical.getAttribute('href');
                meta.domain = UrlParser(req.query.url).hostname;
                let icon = $.querySelector('link[rel=icon]') || $.querySelector('link[rel="shortcut icon"]');
                if(icon) meta.icon = icon.getAttribute('href');
                else meta.icon = icon;
                let metas = $.querySelectorAll('head meta');
                for(let i = 0; i < metas.length; i++) {
                    let el = metas[i];
                    ['title', 'description', 'image', 'theme-color'].forEach(s => {
                        let val = readMT(el, s);
                        if(val) meta[s] = val;
                    });
                    ['og:title', 'og:description', 'og:image', 'og:url', 'og:site_name', 'og:type'].forEach(s => {
                        let val = readMT(el, s);
                        if(val) og[s.split(':')[1]] = val;
                    });
                }
                function readMT(el, name) {
                    var prop = el.getAttribute('name') || el.getAttribute('property');
                    return prop == name ? el.getAttribute('content') : null;
                };
                return res.json({meta, og});
            }).catch(err => {
                if(err.request._isRedirect) {
                    res.status(410).json({
                        error: "Bad redirect",
                        content: `${err.code}: ${err.syscall} from ${err.hostname}`
                    });
                } else if(err.response?.status == 404) {
                    res.status(404).json({
                        error: "Not found",
                        content: err.message
                    });                    
                } else {
                    res.status(502).json({
                        error: "Internal server error",
                        content: err.message
                    });
                }
            });
            break;
        default:
            res.sendStatus(404);
    }
});

app.get('/getMessages/:gid', async (req, res) => {
    if(req.headers.authorization){
        let id = tokenToID(req.headers.authorization)
        if(!users.has(`${id}`)) return res.status(401).json({message : "Invalid token provided"})
        if(!req.params.gid) return res.status(400).json({ message: "No group id provided" })
        let group = groups.has(`${req.params.gid}`);
        if(!group) return res.status(401).json({ message: "Not found" })
        let user_group = users.get(`${id}.groups`).find(g => g == req.params.gid);
        if(!user_group) return res.status(401).json({ message: "Not found" })
        let messages = groups.get(`${user_group}.messages`);
        let users_group = [];
        for (let i = 0; i < messages.length; i++) {
            if(messages[i].attachments) {
                messages[i].attachments = messages[i].attachments.length;
            }
            let links = getAllValidesUrls(messages[i].content);
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
            if(user?.permissions == 1) {
                badges.push("admin");
            }
            if(user?.banned == 1) {
                badges.push("banned");
            }
            users_group.push({
                username: user?.username || "Deleted_User",
                profilePic: user?.profilePic || "https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png",
                id: p.id,
                group_permission: p.permissions || 0,
                badges
            });
        });
        res.json({
            users: users_group,
            messages
        })
    } else return res.status(401).json({message : "Invalid token provided"})
});

app.get('/attachments/:gid/:mid/:aid', (req, res) => {
    if(req.params.gid && req.params.mid && req.params.aid) {
        let { gid, mid, aid } = req.params;
        if(groups.has(`${gid}`)) {
            let groupMessages = groups.get(`${gid}.messages`);
            let msg = groupMessages.find(m => m.id == mid);
            if(msg && msg.attachments && validator.isInt(aid)) {
                let index = parseInt(aid);
                let attachment = msg.attachments[index-1];
                if(attachment) {
                    var base64Data = attachment.src.replace(/^data:image\/(png|jpeg|jpg|webp|gif|jfif|bmp);base64,/, '');
                    var img = Buffer.from(base64Data, 'base64');
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

app.post('/updatePassword', (req, res) => {
    let { body } = req;
    if(body.email && body.digit && body.password) {
        if(!checkEmailAvailability(body.email) && validator.isEmail(body.email)) {
            let digit = parseInt(body.digit);
            if(!isDigit(digit)) return res.status(403).json({message: "Invalid digit", code: "FORBIDDEN"});
            let user = getUserFromEmail(body.email);
            if(users.has(`${user.id}.forgot`)) {
                if(users.get(`${user.id}.forgot.digit`) !== digit) return res.status(401).json({message: "Invalid digit"});
                let timestamp = parseInt(users.get(`${user.id}.forgot.timestamp`));
                if((Date.now()-timestamp) > 600000) {
                    users.delete(`${user.id}.forgot`);
                    return res.status(401).json({message: "The 6-digit expired"})
                } else {
                    users.delete(`${user.id}.forgot`);
                    users.set(`${user.id}.password`, `${CryptoJS.AES.encrypt(body.password, key).toString()}`);
                    return res.status(202).json({message: "Password changed"});
                }
            } else return res.status(401).json({message: "No request is pending"})
        } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"});
    } else return res.status(400).json({message: "No email, digit or password provided."});
})

app.post('/forgotPassword', (req, res) => {
    let { body } = req;
    if(body.email) {
        if(!checkEmailAvailability(body.email) && validator.isEmail(body.email)) {
            let user = getUserFromEmail(body.email);
            if(users.has(`${user.id}.forgot`)) {
                let timestamp = parseInt(users.get(`${user.id}.forgot.timestamp`));
                if((Date.now()-timestamp) > 600000) {
                    users.delete(`${user.id}.forgot`);
                    forgotPassword(user).then((digit) => {
                        users.set(`${user.id}.forgot`, {
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
                forgotPassword(user).then((digit) => {
                    users.set(`${user.id}.forgot`, {
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
});

app.post('/upload', (req, res) => {
    const authToken = req.headers?.authorization;
    if (!authToken || authToken !== process.env.UPLOAD_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }
    const files = req.files.File;
    if (Array.isArray(files)) {
        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            const path = `${FILES_STORE}${file.name}`;
                file.mv(path, (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: 'An error occured during upload, please try again' });
                }
            });
        }
    } else {
        const path = `${FILES_STORE}${files.name}`;
        files.mv(path, (err) => {
            if (err) {
            console.log(err);
            return res.status(500).json({ message: 'An error occured during upload, please try again' });
            }
        });
    }
    return res.status(200).json({ message: 'Files were uploaded' });
});

app.get('/download', (req, res) => {
    try {
        let latest = yaml.load(fs.readFileSync(path.resolve(__dirname, 'files/latest.yml'), 'utf-8'));
        res.download(`./files/${latest.path}`, 'Synko.exe');
    } catch(e) {
        return res.status(502).json({error: e});
    }
});

app.get('/latest', (req, res) => {
    try {
        let latest = yaml.load(fs.readFileSync(path.resolve(__dirname, 'files/latest.yml'), 'utf-8'));
        res.json(latest);
    } catch(e) {
        return res.status(502).json({error: e});
    }
});


/*------------------------------------------\
|-----------------ADMIN API-----------------|
\------------------------------------------*/

    app.get('/admin/users', (req, res) => {
        if(req.headers.authorization){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) != "1") return res.status(401).json({message: "User or invalid token"});
            let usersArr = []
            users.all().forEach(user => {
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
        } res.status(401).json({message : "Unauthorized"})
    })

    app.delete('/admin/users/:id', (req, res) => {
        if(req.headers.authorization && req.params.id){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) != "1") return res.status(401).json({message: "User or invalid token"});
            if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            users.set(`${req.params.id}.banned`, '1');
            onlineUsers.forEach(u => {
                if(u.uid == req.params.id) {
                    u.ws.send(JSON.stringify({
                        type: "admin_disconnect",
                    }));
                }
            });
            return res.status(202).json({message: "Done"})
        } return res.status(401).json({message : "Unauthorized"})
    });

    app.patch('/admin/users/:id', (req, res) => {
        if(req.headers.authorization && req.params.id){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) != "1") return res.status(401).json({message: "User or invalid token"});
            if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            users.set(`${req.params.id}.banned`, '0');
            return res.status(202).json({message: "Done"})
        } return res.status(401).json({message : "Unauthorized"})
    });

    app.post('/admin/disconnectUser/:id', (req, res) => {
        if(req.headers.authorization && req.params.id){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) != "1") return res.status(401).json({message: "User or invalid token"});
            if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            onlineUsers.forEach(u => {
                if(u.uid == req.params.id) {
                    u.ws.send(JSON.stringify({
                        type: "admin_disconnect",
                    }));
                }
            });
            return res.status(202).json({message: "Done"})
        } return res.status(401).json({message : "Unauthorized"})
    });

    app.post('/admin/updateClient/:id', (req, res) => {
        if(req.headers.authorization && req.params.id){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) != "1") return res.status(401).json({message: "User or invalid token"});
            if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            onlineUsers.forEach(u => {
                if(u.uid == req.params.id) {
                    u.ws.send(JSON.stringify({
                        type: "update_client",
                    }));
                }
            });
            return res.status(202).json({message: "Done"})
        } return res.status(401).json({message : "Unauthorized"})
    });

    app.post('/admin/checkToken', (req, res) => {
        if(req.headers.authorization){
            let id = tokenToID(req.headers.authorization)
            if(users.get(`${id}.permissions`) == "1") return res.status(200).json({message: "Admin token"})
            else return res.status(401).json({message: "User or invalid token"})
        } else return res.status(401).json({message: "No token provided"}) ;
    })

    app.post('/admin/login', (req, res) => {
        if(!req.body.password || !req.body.username) return res.status(401).json({message: "Missing data"})
        let id = tokenToID(CryptoJS.AES.encrypt(`${req.body.username}.${req.body.password}`, key))
        if(id){
            if(users.get(`${id}.permissions`) == "1") return res.status(200).json({message: "Valid admin credentials", tkn : CryptoJS.AES.encrypt(`${req.body.username}.${req.body.password}`, key).toString()})
            else return res.status(401).json({message : "Not admin or invalid credentials"})
        } else return res.status(401).json({message : "Not admin or invalid credentials"})
    })

    app.patch('/admin/edit/:id', (req, res) => {
        if(req.headers.authorization && req.params.id){
            let id = tokenToID(req.headers.authorization)
            if(!isAdmin(id)) return res.status(401).json({message: "User or invalid token"});
            if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            console.log(req.body.user)
            Object.keys(req.body.user).forEach(prop => {
                users.set(`${req.params.id}.${prop}`, req.body.user[prop]);
            });
            return res.status(202).json({message: "Done"})
        } return res.status(401).json({message : "Unauthorized"})
    })

    app.post('/admin/createUser', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                let { username, email, password, permissions } = req.body
                if(checkUsernameAvailability(username).available){
                    if(checkEmailAvailability(email) && validator.isEmail(email)){
                        users.set(uuidv4(), {
                            username,
                            email,
                            profilePic : "",
                            password : CryptoJS.AES.encrypt(password, key).toString(),
                            groups : [],
                            permissions
                        })
                        res.status(204).json({message: "Successfully created"})
                    } else return res.status(403).json({message: "Unavailable email", code: "FORBIDDEN"})
                } else return res.status(403).json({message: "Unavailable username", code: "FORBIDDEN"})
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No  token provided"})
    });

    app.get('/admin/onlineUsers', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                let online = []
                onlineUsers.forEach(u => {
                    /*u.ws.send(JSON.stringify({
                        type: "deleted_group",
                        id: socketData.group
                    }));*/
                    online.push(Object.assign(users.get(u.uid), {id: u.uid, date: u.date, version: u.version}))
                });
                res.status(200).json({message: "Success", users: online})
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})   
    })

    app.delete('/admin/links', (req, res) => {
        if(req.headers.authorization && req.body.id){
            if(isAdmin(tokenToID(req.headers.authorization))){
                if(links.has(`${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(req.body.id))}`)) {
                    links.delete(`${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(req.body.id))}`);
                    return res.status(202).json({message: "Done"});
                } else return res.status(401).json({message: "Url not found"})
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})       
    });

    app.post('/admin/links', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                let { domain, aliases, desc, why } = req.body;
                if(!getLink(domain) || !aliases.find(a => Boolean(getLink(a)))) {
                    links.set(`${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(domain))}`, {
                        aliases,
                        desc,
                        why,
                        uses: 0,
                        certifier: tokenToID(req.headers.authorization),
                        date: Date.now()
                    });
                    return res.status(204).json({message: "Successfully registered"});
                } else {
                    return res.status(403).json({message: "Domain as already registered"})
                }
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})
    });

    app.patch('/admin/links', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                if(!getLink(req.body.id) || !req.aliases?.find(a => Boolean(getLink(a)))) {
                    Object.keys(req.body.link).forEach(prop => {
                        links.set(`${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(req.body.id))}.${prop}`, req.body.link[prop]);
                    });
                    return res.status(204).json({message: "Successfully registered"});
                } else {
                    return res.status(403).json({message: "Domain as already registered"})
                }
                if(!users.has(`${req.params.id}`)) return res.status(404).json({message: "User not found"});
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})      
    });

    app.get('/admin/links', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                let allLinks = [];
                links.all().forEach(l => {
                    let obj = {}
                    let data;
                    try {
                        data = JSON.parse(l.data);
                    } catch(e) {
                        data = l.data;
                    }
                    Object.keys(data).forEach(x => {
                        obj[x] = x == "date" 
                            ? new Date(links.get(`${l.ID}.${x}`)).toLocaleString("fr-FR") 
                            : x == "certifier"
                                ? users.get(`${links.get(`${l.ID}.${x}`)}.username`) ? users.get(`${links.get(`${l.ID}.${x}`)}.username`) : links.get(`${l.ID}.${x}`)
                                : links.get(`${l.ID}.${x}`)
                    })
                    Object.assign(obj, {domain: CryptoJS.enc.Base64.parse(l.ID).toString(CryptoJS.enc.Utf8)})
                    allLinks.push(obj);
                });
                return res.json(allLinks);
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})
    });

    app.get('/admin/versions', (req, res) => {
        if(req.headers.authorization){
            if(isAdmin(tokenToID(req.headers.authorization))){
                fs.readdir(path.resolve(__dirname, 'files'), (err, files) => {
                    let latest = yaml.load(fs.readFileSync(path.resolve(__dirname, 'files/latest.yml'), 'utf-8'));
                    let executables = files.filter((v => v.split('.').pop() == "exe"));
                    let versions = [];
                    executables.forEach(async (f) => {
                        let path = path.resolve(__dirname, `files/${f}`);
                        let hash = await hashFile(path);
                        let file = fs.statSync(path);
                        console.log()
                    });
                });
                return res.json({"coucou": true});
            } else return res.status(401).json({message: "Not admin or invalid token provided"})
        } else return res.status(403).json({message: "No token provided"})
    });

    function hashFile(file, algorithm = 'sha512', encoding = 'base64', options) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(algorithm);
            hash.on('error', reject).setEncoding(encoding);
            fs.createReadStream(
                file,
                Object.assign({}, options, {
                highWaterMark: 1024 * 1024,
                })
            ).on('error', reject).on('end', () => {
                hash.end();
                resolve(hash.read());
            }).pipe(hash, {
                end: false,
            });
        });
    }

    function isAdmin(id){
        if(users.get(`${id}.permissions`) != "1") return false
        else return true
    }
/*------------------------------------------\
|--------------END ADMIN API----------------|
\------------------------------------------*/

app.get('*', function(req, res) {
    res.redirect('https://synko.kunah.fr')
})

// Server starting
app.listen(process.env.PORT, () => {
    console.info(colors.cyan(`> Serveur connecté sur le port ${process.env.PORT}`));
})

function getStatus(uid) {
    let uuid = null;
    onlineUsers.forEach(u => {
        if(u.uid == uid) return uuid = true;
    })
    return uuid ? 'online' : 'offline';
}

function forgotPassword(user) {
    return new Promise(async (resolve, reject) => {
        let digit = Math.floor(100000 + Math.random() * 900000);
        await transporter.sendMail({
            from: '"Synko App" <synko.contact@gmail.com>',
            to: `${user.email}`,
            subject: "Password change requested | Synko App",
            text: `Your 6-digit is : ${digit}\nIf it's not you requested password changing, ignore this email.`,
            html: `Your 6-digit is : ${digit}<br>If it's not you requested password changing, ignore this email.`
        });
        resolve(digit);
    })
}

// Username availability checking function
function checkUsernameAvailability(str){
    let available = true
    let userData = null;
    let uuid;
    users.all().forEach(user => {
        let data = users.get(`${user.ID}`)
        if(data.username == str){
            available = false;
            userData = data;
            uuid = user.ID
        }
    })
    return { available , userData, uuid }
}

function getLink(link) {
    let data = null;
    if(links.has(`${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(link))}`)) {
        return link;
    } else {
        links.all().forEach(l => {
            if(links.get(`${l.ID}.aliases`).includes(link)) {
                data = CryptoJS.enc.Base64.parse(l.ID).toString(CryptoJS.enc.Utf8)
            }
        });
        return data;
    }
}

function getUserFromEmail(email) {
    let userData = null;
    users.all().forEach(user => {
        let data = users.get(`${user.ID}`)
        if(data.email == email){
            userData = data;
            userData.id = user.ID;
        }
    });
    return userData;
}

// Email availability checking function
function checkEmailAvailability(str){
    let arr = []
    users.all().forEach(user => {
        let data = users.get(`${user.ID}`)
        arr.push(data.email)
    })
    return !arr.includes(str)
}

// Decrypting function
function decrypt(str){
    return CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8)
}

function tokenToID(tkn){
    if(!tkn) return null
    let token = decrypt(tkn).split('.')
    let id = null;
    users.all().forEach(user => {
        let data = users.get(`${user.ID}`)
        if(data.username == token[0] && decrypt(data.password) == token[1]) id = user.ID
    })
    return id
}

function getAllValidesUrls(string) {
    let regexp = /((https?):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))/g;
    let founds = string.match(regexp);
    let urls = [];
    if(!founds) return [];
    founds.forEach(url => {
        if(urls.length >= 5) return;
        let urlParsed = UrlParser(url, true);
        let link = getLink(urlParsed.hostname);
        if(link) {
            urls.push(url);
        }
    });
    return urls;
}

wsServer.on('request', function(request) {
    let connection = request.accept(null, request.origin);

    connection.on('close', function(reasonCode, description) {
        let id = onlineUsers.get(request.key);
        onlineUsers.delete(request.key);
    });

    connection.on("message", async data => {
        let socketData;
        try {
            socketData = JSON.parse(data.utf8Data)
        } catch (error) {
            return console.log(error)
        }
        let id = tokenToID(socketData.token)
        if(!id) return;
        if(socketData.type == "connection"){
            if(getStatus(id) == 'online') return;
            onlineUsers.set(request.key, {
                uid: id,
                version: socketData.version,
                date: Date.now(),
                ws: connection
            });
            console.log(`[${new Date().toLocaleString()}] - Connected: ${users.get(`${id}.username`)}, ID: ${id}, Permission : ${users.get(`${id}.permissions`)}, Version : v${socketData.version}`)
        }
        if(socketData.type == "connection-group" && request.resourceURL.pathname == "/groups" && request.resourceURL.query.id){
            if(getStatus(id) == 'online') return;
            onlineUsers.set(request.key, {
                uid: id,
                version: socketData.version,
                date: Date.now(),
                ws: connection
            });
            console.log(`[${new Date().toLocaleString()}] - Connected: ${users.get(`${id}.username`)}, ID: ${id}, Permission : ${users.get(`${id}.permissions`)}, Version : v${socketData.version}`)
            if(!webSockets.has(`${request.resourceURL.query.id}`)) webSockets.set(`${request.resourceURL.query.id}`, []);
            let connections = webSockets.get(`${request.resourceURL.query.id}`);
            connections.push(connection);
            webSockets.set(`${request.resourceURL.query.id}`, connections);
        }
        if(socketData.type == "new_message"){
            if(request.resourceURL.pathname == "/groups" && request.resourceURL.query.id) {
                let group = `${request.resourceURL.query.id}`;
                if(!webSockets.has(group)) return;
                let { msg, attachments } = socketData;
                let participants_id_arr = []
                if(!groups.has(group)) return
                groups.get(group).participants.forEach(user => { participants_id_arr.push(user.id) })
                if(participants_id_arr.indexOf(id) > -1){
                    let msg_group = groups.get(group);
                    let newMessage = {
                        id:  Math.floor(Math.random()*Date.now()),
                        content: msg,
                        author: id,
                        date: Date.now(),
                    }
                    let new_attachments = [];
                    if(attachments.length > 5) {
                        attachments = attachments.splice(5, attachments.length - 5);
                    }
                    let links = getAllValidesUrls(msg);
                    if(links.length > 0) {
                        newMessage.links = [];
                        for (let i = 0; i < links.length; i++) {
                            let url = links[i];
                            console.log(url)
                            const response = await fetch(`https://api.synko.kunah.fr/proxy/m?url=${encodeURIComponent(url)}`);
                            const data = await response.json();
                            if(data.error) return console.log(data.error);
                            Object.assign(data.meta, data.og);
                            data.meta.site = url
                            newMessage.links.push(data.meta)
                        }
                    } 
                    attachments.forEach(a => {
                        new_attachments.push({
                            src: a.src,
                            file: a.file
                        });
                    });
                    if(attachments.length == 0) {
                        msg_group.messages.push({
                            ...newMessage,
                        });                        
                    } else {
                        msg_group.messages.push({
                            ...newMessage,
                            attachments: new_attachments
                        });
                    }
                    webSockets.get(group).forEach(c => {
                        c.send(JSON.stringify({
                            ...newMessage,
                            type: "new_message",
                            attachments: attachments.length
                        }));
                    });
                    groups.set(group, msg_group);
                } else return;            
            }
        } else if(socketData.type == "delete_msg"){
            if(request.resourceURL.pathname == "/groups" && request.resourceURL.query.id){
                let group = `${request.resourceURL.query.id}`;
                if(!webSockets.has(group)) return console.log('groupe_socket');
                if(!groups.has(group)) return console.log('groupe_db')
                let participants_id = []
                groups.get(`${group}.participants`).forEach(user => {participants_id.push(user.id)})
                if(!participants_id.includes(id)) return console.log('membre_groupe')
                let msgs = groups.get(`${group}.messages`);
                let toDelete = msgs.find(m => m.id == socketData.message_id);
                if(!toDelete) return console.log('message_db');
                msgs.splice(msgs.indexOf(toDelete), 1)
                groups.set(`${group}.messages`, msgs);
                webSockets.get(group).forEach(c => {
                    c.send(JSON.stringify({type:"deleted_message", id:socketData.message_id}));
                })
            }
        } else if(socketData.type == "delete_group"){
            if(groups.get(`${socketData.group}.owner`) == id || users.get(`${id}.permissions`) == 1){
                let participants = [];
                groups.get(`${socketData.group}`).participants.forEach(p => {
                    participants.push(p);
                    if(users.has(`${p.id}`)) {
                        let user_groups = users.get(`${p.id}.groups`);
                        user_groups?.splice(users.get(`${p.id}.groups`).indexOf(socketData.group), 1);
                        users.set(`${p.id}.groups`, user_groups);                        
                    }

                });
                groups.delete(`${socketData.group}`);
                /*webSockets.get(socketData.group).forEach(c => {
                    c.send(JSON.stringify({type:"deleted_group", id:socketData.group}));
                });*/
                onlineUsers.forEach(u => {
                    if(participants.find(usr => usr.id == u.uid)) {
                        u.ws.send(JSON.stringify({
                            type: "deleted_group",
                            id: socketData.group
                        }));
                    }
                });
            } else return
        }
    });
});

httpServer.listen(process.env.WS_PORT, () => {
    console.log(colors.cyan(`> Serveur WS connecté sur le port ${process.env.WS_PORT}`))
});

/*setInterval(() => {
    console.table({
        RAM_Usage : `${process.memoryUsage().heapUsed}/${process.memoryUsage().heapTotal} (${(process.memoryUsage().heapUsed/process.memoryUsage().heapTotal)*100}%)`,
        CPU_Usage : `System : ${process.cpuUsage().system/1000000}s, User : ${process.cpuUsage().user/1000000}s`
    })
}, 10000);*/


//curl -X POST -H 'Authorization: U2FsdGVkX1+jJ7Kwcg85k3TwkmxBLFkDv80rnqDvv7Y' -F 'File=@client/dist/latest.yml' -F 'File=@client/dist/Synko Client.exe' -F 'File=@client/dist/Synko Client.exe.blockmap' https://api.synko.kunah.fr/upload
