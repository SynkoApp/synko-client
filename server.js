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
const nodemailer = require('nodemailer');
const fileUpload = require('express-fileupload');
const path = require('path');
const cheerio = require('cheerio');
const { default: axios } = require('axios');
const { default: validator } = require('validator');
let users = new db.table('users')
let groups = new db.table('groups')
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({path : "./.env"});
let key = process.env.KEY
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
}) 

users.all().forEach(e => {
    users.set(`${e.ID}.groups`, []);
}) */
function isDigit(digit){return/\d{6}/.test(digit);}
if(users.has('undefined')) users.delete('undefined');

// Token checking API (POST)
app.post('/checkToken', (req, res) => {
    if(req.body.username && req.body.token){
        let { username, token } = req.body
        token = decrypt(token).split('.')
        if(token[0] == username && !checkUsernameAvailability(username).available && decrypt(checkUsernameAvailability(username).userData.password) == token[1]){
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
                status: getStatus(user.uuid)
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
})

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
})

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
            /*urlMetadata(req.query.url, {
                userAgent: "Synko Bot",
                fromEmail: "bot@synko.xyz"
            }).then(meta => {
                res.json(meta)
            }, err => {
                res.send(err);
            });*/
            axios({
                method: "GET",
                url: `${req.query.url}`,
                headers: {
                    "User-Agent": "Synko Bot"
                }
            }).then(resp => {
                if(resp.headers['content-type'].includes('application/octet-stream')) return res.status(400).json({message : "No url provided"});
                let $ = cheerio.load(resp.data);
                
                res.send(metascraper({ html: `${resp.data}`, url: `${resp.config.url}` }));
            }).catch(err => {
                res.send(err);
            });
            break;
        default:
            res.sendStatus(404);
    }
});

app.get('/getMessages/:gid', (req, res) => {
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
        }
        let participants = groups.get(`${user_group}.participants`);
        participants.forEach(p => {
            let user = users.get(`${p.id}`)
            users_group.push({
                username: user.username || "Deleted_User",
                profilePic: user.profilePic || "https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png",
                id: p.id,
                group_permission: p.permissions
            });
        });
        res.json({
            users: users_group,
            messages
        });
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

app.get('*', function(req, res) {
  res.redirect('https://synko.kunah.xyz')
})

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
            users.delete(`${req.params.id}`);
            res.status(202).json({message: "Done"})
        } res.status(401).json({message : "Unauthorized"})
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
            Object.keys(req.body.user).forEach(prop => {
                users.set(`${req.params.id}.${prop}`, `${req.body.user[prop]}`);
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
    })

    function isAdmin(id){
        if(users.get(`${id}.permissions`) != "1") return false
        else return true
    }
/*------------------------------------------\
|--------------END ADMIN API----------------|
\------------------------------------------*/

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

wsServer.on('request', function(request) {
    let connection = request.accept(null, request.origin);

    connection.on('close', function(reasonCode, description) {
        let id = onlineUsers.get(request.key);
        onlineUsers.delete(request.key);
    });

    connection.on("message", data => {
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
                ws: connection
            });
            console.log(`Connected: ${users.get(`${id}.username`)}, ID: ${id}, Permission : ${users.get(`${id}.permissions`)}`)
        }
        if(socketData.type == "connection-group" && request.resourceURL.pathname == "/groups" && request.resourceURL.query.id){
            if(getStatus(id) == 'online') return;
            onlineUsers.set(request.key, {
                uid: id,
                ws: connection
            });
            console.log(`Connected: ${users.get(`${id}.username`)}, ID: ${id}, Permission : ${users.get(`${id}.permissions`)}`)
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
            if(groups.get(`${socketData.group}.owner`) == id){
                groups.get(`${socketData.group}`).participants.forEach(p => {
                    let user_groups = users.get(`${p.id}.groups`)
                    user_groups.splice(users.get(`${p.id}.groups`).indexOf(socketData.group), 1)
                    users.set(`${p.id}.groups`, user_groups)
                })
                groups.delete(`${socketData.group}`)
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


//curl -X POST -H 'Authorization: U2FsdGVkX1+jJ7Kwcg85k3TwkmxBLFkDv80rnqDvv7Y' -F 'File=@client/dist/latest.yml' -F 'File=@client/dist/Synko Client-1.1.0.exe' -F 'File=@client/dist/Synko Client-1.1.0.exe.blockmap' http://localhost:4060/upload
