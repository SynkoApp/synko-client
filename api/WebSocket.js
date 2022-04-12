const webSocketServer = require('websocket').server;

module.exports = class WebSocket extends webSocketServer {
    constructor(props) {
        super(props);
    }

    run() {
        this.on('request', function(request) {
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
        return this;
    }
}