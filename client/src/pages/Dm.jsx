import React from 'react';
import LeftMenu from "../components/LeftMenu";
import Slider from "../components/Slider";
import { checkToken } from '../utils/functions';
import { Redirect } from 'react-router-dom';
import Message from '../components/Message';
import UserButton from '../components/UserButton';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import axios from 'axios';
import { API_URL, WS_URL } from '../utils/APIBase';
import $ from 'jquery';
import xssFilter from 'xss-filters';
import { unemojify, random } from 'node-emoji';
import Picker from 'emoji-picker-react';
import { renderToString } from 'react-dom/server';
import {retrieveImageFromDataToBase64} from '../utils/functions';
import ContentEditable from 'react-contenteditable';
import { clipboard } from '../utils/electron';
import { BsPlusCircleFill } from 'react-icons/bs'
import IDE from 'react-ace';
import Code from '../components/Code'
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file;

export default class Dm extends React.Component {
    constructor(props){
        super(props)
        this.counter = 0;
        this.state = {
            messages: [],
            users: [],
            socket: null,
            wsIsOpened: false,
            attachments: {
                message: "",
                files: [],
                open: "hidden"
            },
            image : {},
            error: null
        }
        this.messages = []
    }

    async getMessages(){
        try {
            let req = await axios({
                url : `${API_URL}/getMessages/${this.props.match.params.id}`,
                method : "get",
                headers : {
                    "Authorization" : `${localStorage.getItem('token')}`
                }
            });
            this.setState({ messages: req.data.messages, users: req.data.users });
            setTimeout(() => {
                let element = $("#messages-box");
                element.scrollTop(element.prop('scrollHeight'));
            });
        } catch(err) {
            return this.setState({
                redirect: "/"
            });
        }
    }

    async componentDidMount(){
        if(!this.props.match.params.id) return this.setState({ redirect: "/" })
        document.addEventListener('mousedown', this.handleClickOutside);
        if(localStorage.getItem('username') && localStorage.getItem('token')){
            let tknValidation = await checkToken(localStorage.getItem('token'), localStorage.getItem('username'))
            if(tknValidation.status === 200){
                this.connect();
                return this.getMessages();
            }
        }
        this.setState({redirect : "/login"})
    }

    updateScroll(){
        let element = $("#messages-box");
        element.animate({
            scrollTop: element.prop("scrollHeight")
        }, 'smooth');
    }

    userSearching (arg){
        this.setState({searchUserDisplay : arg})
    }

    handleEmojisSelect(evt, emoji) {
        document.querySelector('#msgSender').innerText += emoji.emoji;
        $("#msgSender").focus();
    }

    handleEmojiPicker() {
        document.querySelector("#emoji-picker .emoji-search").setAttribute('placeholder', `${random().key}`);
        $("#emoji-picker").toggleClass('hidden');
    }

    sendMessage(e){
        e.preventDefault()
        if(document.querySelector('#msgSender').innerText.trim().length > 500) return;
        if(this.counter > 5) return;
        this.counter += 1
        setTimeout(() => {
            this.counter -= 1
        }, 10000);
        let msg = document.querySelector('#msgSender').innerText.trim();
        if(msg == "" && this.state.attachments.files.length < 1) return;
        if(msg == "" && document.querySelector('#imgInputModal')) {
            msg = document.querySelector('#imgInputModal').value.trim();
        }
        let msgObject = {
            type:"new_message", 
            msg: unemojify(msg), 
            token: localStorage.getItem('token'),
            attachments: [...this.state.attachments.files]
        }
        this.state.socket.send(JSON.stringify(msgObject));
        document.querySelector('#msgSender').innerText = "";
        if(this.state.attachments.files.length > 0) {
            this.setState({
                attachments: {
                    message: "",
                    files: [],
                    open: "hidden"
                },
            });
        }
    }

    deleteMessage(e){
        let toDelete = {
            type:"delete_msg", 
            token: localStorage.getItem('token'),
            message_id: e
        }
        this.state.socket.send(JSON.stringify(toDelete));
    }

    isOnlyEmojis(str) {
        var emoji_regex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/;
        return emoji_regex.test(str);
    }

    handleClickOutside(event) {
        if(!event.path.find(e => e.id == "emoji-picker") && event.target.id !== "msgSender"){
            $('#emoji-picker').addClass('hidden');
        }
    }

    connect() {
        let ws = new W3CWebSocket(`${WS_URL}/groups?id=${encodeURIComponent(this.props.match.params.id)}`);
        this.setState({socket : ws})
        ws.onopen = () => {
            this.setState({wsIsOpened: true})
            ws.send(JSON.stringify({token:localStorage.getItem('token'), type:"connection-group",}))
            console.log("WebSocket: Connected on group")
        }
        ws.onmessage = msg => {
            let data = JSON.parse(msg.data);
            if(data.type == "new_message"){
                setTimeout(() => {
                    let user = this.state.users.find(u => u.id == data.author);
                    console.log(user)
                    if(data.content.startsWith('\`\`\`') && data.content.endsWith('\`\`\`')){
                        this.setState({messages : [...this.state.messages, data]})
                    } else $("#messages-box").append(renderToString(<Message deleteMsg={this.deleteMessage.bind(this)} newMsg author={user} message={{id: data.id, date: data.date, attachments: data.attachments, links: data.links}} isOwner={user.group_permission == 1?true:false} groupId={this.props.match.params.id} key={data.id}>{xssFilter.inHTMLData(data.content)}</Message>));
                    $(`#msg-${data.id} > div:last-of-type > ul li`).each((i, elem) => {
                        $(elem.children[0]).on('click', () => {
                            if($(elem).hasClass("cpy-btn")) {
                                clipboard.writeText(data.content, "clipboard");
                            } else if($(elem).hasClass("cid-btn")) {
                                clipboard.writeText(`${data.id}`, "clipboard");
                            } else if($(elem).hasClass("dlt-btn")) {
                                this.deleteMessage(data.id);
                            }
                        });
                    });
                }, 0)
                setTimeout(() => {
                    this.updateScroll();
                }, 200);
            } else if(data.type == "deleted_message"){
                $(`#msg-${data.id}`).remove();
            } else if(data.type == "new_group") {
                let { group } = data;
                $("#groups-ctn").append(renderToString(<UserButton ws={this.ws} key={Math.floor(Math.random()*Date.now())} owner={group.owner} id={group.id} username={group.name} img={group.avatar} data-tip={group.name} />)); 
            } else if(data.type == "deleted_group"){
                $(`#group-${data.id}`).remove();
                if(this.props.match.params.id == data.id) {
                    this.setState({
                        redirect: "/"
                    });                    
                }
            }
        }
        ws.onclose = () => {
            this.setState({wsIsOpened: false})
            console.log('WebSocket: Disconnected. Reconnect will be attempted in 1 second.')
            setTimeout(() => {
                if(window.location.hash !== `#/dm/${this.props.match.params.id}`) return;
                this.checkSocket();
            }, 1000);
        }

        ws.onerror = (err) => {
            console.error('WebSocket: Error. ', err.message, 'Closing socket')
            ws.close();
        };
    }

    checkSocket() {
        const { socket } = this.state;
        if (!socket || socket.readyState == WebSocket.CLOSED) this.connect();
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
        this.state.socket?.close();
    }

    setParentState(param) {
        this.setState(param)
    }

    handleDragStart(evt) {
        let arr = [];
        for (let i = 0; i < evt.dataTransfer.items.length; i++) {
            if(evt.dataTransfer.items[i].kind == "file") arr.push(evt.dataTransfer.items[i]);
        }
        if (arr.length > 0) {
            if(!$("#droppable-box").hasClass('hidden')) return;
            $("#droppable-box").removeClass('hidden');
        }
    }

    handleDragLeave(evt) {
        if($("#droppable-box").hasClass('hidden')) return;
        $("#droppable-box").addClass('hidden');
    }

    async handleDrop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        if (evt.dataTransfer.files && evt.dataTransfer.files.length > 0) {
            let files = evt.dataTransfer.files;
            let files_arr = [];
            let maxSize = 0;
            for (let i = 0; i < files.length; i++) {
                if(files[i].type.indexOf("image") == -1) continue;
                maxSize += files[i].size;
                if(maxSize > 10000000) {
                    this.setState({
                        error: "imgToBig"
                    });
                    break;
                }
                let file = {
                    getRawFile: () => files[i],
                    name: files[i].name,
                    size: files[i].size,
                };
                let result = await retrieveImageFromDataToBase64(file.getRawFile());
                files_arr.push({
                    src: result,
                    file,
                });
            }
            if(files_arr.length > 0) {
                this.setState({
                    attachments: {
                        message: document.querySelector('#msgSender').value,
                        files: files_arr,
                        open: "block"
                    },
                });                
            } else {
                this.setState({
                    error: "fileNotSupported"
                })
            }
        }
        $("#droppable-box").addClass('hidden');
    }

    handleDragOver(evt) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy';
    }
    
    async handlePaste(evt) {
        if (evt.clipboardData.files.length > 0) {
            evt.preventDefault();
            let files = evt.clipboardData.files;
            let files_arr = [];
            let maxSize = 0;
            for(let i = 0; i < files.length; i++) {
                if(files[i].type.indexOf("image") == -1) continue;
                maxSize += files[i].size;
                if(maxSize > 10000000) {
                    this.setState({
                        error: "imgToBig"
                    });
                    break;
                }
                let file = {
                    getRawFile: () => files[i],
                    name: files[i].name,
                    size: files[i].size,
                };
                let result = await retrieveImageFromDataToBase64(file.getRawFile())
                files_arr.push({
                    src: result,
                    file,
                });
            }
            this.setState({
                attachments: {
                    message: document.querySelector('#msgSender').value,
                    files: files_arr,
                    open: "block"
                },
            });
        }
    }

    sendCode(code, lang){
        let msgObject = {
            type:"new_message", 
            msg: `\`\`\`${lang}\n${code}\`\`\``, 
            token: localStorage.getItem('token'),
            attachments: [...this.state.attachments.files]
        }
        this.state.socket.send(JSON.stringify(msgObject));
        document.querySelector('#ide-modal').classList.replace('flex', 'hidden')
    }

    render (){
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        if(!this.state.wsIsOpened) return <></>;

        return (
            <div className={'overflow-auto h-full flex bg-gray-700'}>
                <LeftMenu ws={this.state.socket} toHome key={Math.floor(Date.now()*Math.random())}/>
                <div className={'flex-grow flex flex-col relative'}>
                    <div onDragOver={this.handleDragOver.bind(this)} onDrop={this.handleDrop.bind(this)} onDragLeave={this.handleDragLeave.bind(this)} id="droppable-box" className={'hidden absolute z-40 w-full pb-6 h-full bg-gray-500 bg-opacity-50'}>
                        <div className={'border-4 text-gray-200 font-semibold text-xl flex justify-center items-center w-full h-full border-dashed border-green-600'}>
                            Drop your file(s) here
                        </div>
                    </div>
                    <ImageSendModal setParentState={this.setParentState.bind(this)} onSend={this.sendMessage.bind(this)} open={this.state.attachments.open} images={this.state.attachments.files} message={this.state.attachments.message}/>
                    <IdeModal send={this.sendCode.bind(this)}/>
                    <div id="messages-box" onDragOver={this.handleDragOver.bind(this)} onDragEnter={this.handleDragStart.bind(this)} className={'flex-grow overflow-auto w-full'}>
                        {this.state.messages.map(m => { 
                            if(m.content.startsWith('\`\`\`') && m.content.endsWith('\`\`\`')) return <Code deleteMsg={this.deleteMessage.bind(this)} author={this.state.users.find(u => u.id == m.author)} isOwner={this.state.users.find(u => u.group_permission == 1 && m.author == u.id)?true:false} message={{id: m.id, date: m.date, attachments: m.attachments}} groupId={this.props.match.params.id} key={m.id}>{m.content}</Code>
                            else return <Message deleteMsg={this.deleteMessage.bind(this)} author={this.state.users.find(u => u.id == m.author)} isOwner={this.state.users.find(u => u.group_permission == 1 && m.author == u.id)?true:false} message={{id: m.id, date: m.date, attachments: m.attachments, links: m.links}} groupId={this.props.match.params.id} key={m.id}>{xssFilter.inHTMLData(m.content)}</Message>
                        })}
                    </div>
                    <div id="input-ctn" className={'min-h-20 shadow-input py-2 z-30 pt-0 text-center px-4'}>
                        <div id="emoji-picker" className={'absolute bottom-24 right-4 hidden z-20'} key={Math.floor(Math.random()*Date.now())}>
                            <Picker onEmojiClick={this.handleEmojisSelect} groupNames={lang.emojisGroups} />
                        </div>
                        <div className={'group'}>
                            <BsPlusCircleFill style={{bottom: '3.15rem'}} className={'absolute left-7 z-10 text-gray-400 text-xl cursor-pointer hover:text-gray-200'}/>
                            <div className={'absolute left-7 bottom-16 pb-4 z-10 hidden group-hover:block'}>
                                <ul className={'p-1 rounded text-gray-200 bg-gray-800'}>
                                    <li onClick={() => { document.querySelector('#ide-modal').classList.replace('hidden', 'flex') }} className={'hover:bg-gray-650 p-2 font-semibold hover:text-white cursor-pointer rounded'}>{lang.openEditor}</li>
                                </ul>
                            </div>
                        </div>
                        <div id="sender-ctn" className={'absolute w-full left-0 bottom-10 px-4'} >
                            <ContentEditable
                                html={""}
                                data-placeholder={lang.dm.sendMessage+'...'}
                                id="msgSender"
                                onPaste={this.handlePaste.bind(this)}
                                onKeyPress={(e)=>{
                                    if(e.key == "Enter" && !e.shiftKey) this.sendMessage(e, this);
                                }} 
                                placeholder={lang.dm.sendMessage+'...'}
                                className={'overflow-auto items-start text-left shadow-input w-full bg-gray-650 h-min max-h-96 rounded-md px-10 py-2 focus:outline-none text-gray-200'}
                            />
                        </div>
                        <img onClick={this.handleEmojiPicker} className={'absolute right-5 bottom-11 w-8 filter grayscale transition-all cursor-pointer hover:filter-none'} src="./emojis/smileys_and_emotion/1f602.webp" alt="emoji-menu" />
                        {this.state.error ? <span className={"text-xxs absolute left-8 bottom-6 select-none text-red-500"}>{this.state.error}</span> : ""}
                    </div>
                </div>
            </div>
        )
    }
}

class IdeModal extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            codeLang : "javascript"
        }
        this.codeLanguages = [
            {lname:"actionscript",dname:"ActionScript"}, {lname:"apache_conf",dname:"Apache conf."},
            {lname:"applescript",dname:"AppleScript"}, {lname:"asciidoc",dname:"ASCII Doc"},
            {lname:"assembly_x86",dname:"Assembly (x86)"},
            
            {lname:"batchfile",dname:"Batchfile"},

            {lname:"c_cpp",dname:"C/C++"}, {lname:"objectivec",dname:"Objective-C"}, {lname:"csharp",dname:"C#"},

            {lname:"clojure",dname:"Clojure"},

            {lname:"coffee",dname:"CoffeeScript (JS)"},
            {lname:"ejs",dname:"EJS"}, {lname:"elm",dname:"ELM (JS)"},
            {lname:"javascript",dname:"JavaScript"}, {lname:"jsx",dname:"JSX"}, 
            {lname:"tsx",dname:"TSX"}, {lname:"typescript",dname:"TypeScript"}, 

            {lname:"css",dname:"CSS"}, {lname:"sass",dname:"Sass"}, {lname:"scss",dname:"SCSS"}, {lname:"less",dname:"Less"}, 

            {lname:"dart",dname:"Dart"},
            {lname:"dockerfile",dname:"Dockerfile"},

            {lname:"elixir",dname:"Elixir"},
            {lname:"erlang",dname:"Erlang"},

            {lname:"fortran",dname:"Fortran"},

            {lname:"glsl",dname:"OpenGL Shading Language"},
            {lname:"golang",dname:"Golang"},
            {lname:"graphqlschema",dname:"GraphQL Schema"},

            {lname:"haml",dname:"Haml"},
            {lname:"haskell",dname:"Haskell"},
            {lname:"html",dname:"HTML"},

            {lname:"ini",dname:"ini"},

            {lname:"jade",dname:"Jade"},
            {lname:"java",dname:"Java"}, {lname:"kotlin",dname:"Kotlin (Java)"},
            {lname:"json",dname:"JSON"},

            {lname:"lua",dname:"Lua"},

            {lname:"markdown",dname:"Markdown"},
            {lname:"matlab",dname:"MATLAB"},

            {lname:"pascal",dname:"Pascal"},
            {lname:"perl",dname:"Perl"},
            {lname:"php",dname:"PHP"},
            {lname:"plain_text",dname:"Plain text"},
            {lname:"powershell",dname:"PowerShell"},
            {lname:"python",dname:"Python"}, {lname:"django",dname:"Django (Python)"},

            {lname:"r",dname:"R"}, 
            {lname:"ruby",dname:"Ruby"}, {lname:"curly",dname:"Curly (Ruby)"},
            {lname:"rust",dname:"Rust"},

            {lname:"scala",dname:"Scala"},
            {lname:"mysql",dname:"MySQL"}, {lname:"sql",dname:"SQL"},
            {lname:"sqlserver",dname:"SQL Server"}, {lname:"pgsql",dname:"PostgreSQL"}, 
            {lname:"swift",dname:"Swift"},

            {lname:"twig",dname:"Twig"},

            {lname:"vbscript",dname:"VBScript"},

            {lname:"xml",dname:"XML"},
            {lname:"yaml",dname:"Yaml"},
        ]
    }

    render(){
        require(`ace-builds/src-min-noconflict/mode-${this.state.codeLang}`)
        require('ace-builds/src-min-noconflict/theme-tomorrow_night')
        require('ace-builds/src-min-noconflict/ext-error_marker')
        require('ace-builds/src-min-noconflict/ext-language_tools')
        return(
            <div id="ide-modal" className={'absolute hidden items-center justify-center z-50 w-full h-full bg-black bg-opacity-40'}>
                <div className={`bg-gray-750 w-1/2 rounded absolute inset-auto flex flex-col items-center pt-2 p-6 z-10`}>
                    <h2 className={"text-gray-200 font-semibold"}>{lang.sharecode}</h2>
                    <select onChange={(e) => {this.setState({codeLang: e.target.value})}} className={'bg-gray-700 mb-2 text-gray-200 rounded'}>
                        {this.codeLanguages.map(c => {
                            return <option key={c.lname} value={c.lname}>{c.dname}</option>
                        })}
                    </select>
                    <IDE onChange={(e) => {
                        this.setState({code: e})
                    }} id="ide" mode={this.state.codeLang} fontSize={14} setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true,
                        enableSnippets: true,
                        showLineNumbers: true,
                        tabSize: 4,
                        useWorker: false
                    }} theme={'tomorrow_night'} style={{width: "100%", height: "400px"}}/>
                    <div className={'flex w-full mt-2'}>
                        <button onClick={() => {document.querySelector('#ide-modal').classList.replace('flex', 'hidden')}} className={'text-blue-500 underline'}>{lang.closeCode}</button>
                        <div className={'flex-grow'}></div>
                        <button onClick={e => {e.preventDefault(); this.props.send(this.state.code, this.state.codeLang)}} className={'bg-green-500 font-semibold text-white rounded py-1 px-2'}>{lang.sendCode}</button>
                    </div>
                </div>
            </div>
        )
    }
}

class ImageSendModal extends React.Component {
    constructor(props) {
        super(props)
    }


    render(){
        return(
            <div className={`${this.props.open} absolute flex items-center justify-center z-50 w-full h-full bg-black bg-opacity-40`}>
                <div className={`bg-gray-750 w-1/3 rounded absolute inset-auto flex flex-col items-center py-2 p-6 z-10`}>
                    <h2 className={"text-gray-200 font-semibold"}>Send image</h2>
                    <div className={'block mx-auto my-4 relative'}>
                        <Slider images={this.props.images}/>
                    </div>
                    <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='grpname'>Message</label>
                    <div className={'w-full relative mb-4'}>
                        <input placeholder="Add a comment..." onFocus={(e) => { e.target.select() }} autoComplete={"off"} defaultValue={this.props.message} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="imgInputModal"/>
                        <small id="pp_err" className={"hidden text-red-500"}>{lang.file?.error}</small>
                        <small id="ext_err" className={"hidden text-red-500"}>Invalid extension ({["png", "jpg", "jfif", "gif", "webp"].join(', ')})</small>
                    </div>
                    <div className={'flex w-full mt-2'}>
                        <button onClick={() => this.props.setParentState({attachments: {
                            files: [],
                            open: "hidden",
                            message: "",
                        }})} className={'text-blue-500 underline'}>Close</button>
                        <div className={'flex-grow'}></div>
                        <button onClick={e => this.props.onSend(e)} className={'bg-green-500 font-semibold text-white rounded py-1 px-2'}>Send</button>
                    </div>
                </div>
            </div>
        )
    }
}