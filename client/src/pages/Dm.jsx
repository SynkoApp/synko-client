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
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file;

export default class Dm extends React.Component {
    constructor(props){
        super(props)
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
        let req = await axios({
            url : `${API_URL}/getMessages/${this.props.match.params.id}`,
            method : "get",
            headers : {
                "Authorization" : `${localStorage.getItem('token')}`
            }
        });
        this.setState({ messages: req.data.messages, users: req.data.users });
        setTimeout(() => {
            this.updateScroll();
        });
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
                    let array = this.state.messages;
                    array.push()
                    $("#messages-box").append(renderToString(<Message author={user} message={{id: data.id, date: data.date, attachments: data.attachments}} groupId={this.props.match.params.id} key={data.id}>{xssFilter.inHTMLData(data.content)}</Message>));
                }, 0)
                setTimeout(() => {
                    this.updateScroll();
                }, 200);
            } else if(data.type == "deleted_message"){
                $(`#msg-${data.id}`).remove();
            } else if(data.type == "new_group") {
                let { group } = data;
                $("#groups-ctn").append(renderToString(<UserButton ws={this.ws} key={Math.floor(Math.random()*Date.now())} owner={group.owner} id={group.id} username={group.name} img={group.avatar} data-tip={group.name} />));
                
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
                    <div id="messages-box" onDragOver={this.handleDragOver.bind(this)} onDragEnter={this.handleDragStart.bind(this)} className={'flex-grow overflow-auto w-full'}>
                        {this.state.messages.map(m => <Message deleteMsg={this.deleteMessage.bind(this)} author={this.state.users.find(u => u.id == m.author)} message={{id: m.id, date: m.date, attachments: m.attachments}} groupId={this.props.match.params.id} key={m.id}>{xssFilter.inHTMLData(m.content)}</Message>)}
                    </div>
                    <div id="input-ctn" className={'min-h-20 shadow-input py-2 z-30 pt-0 text-center px-4'}>
                        <div id="emoji-picker" className={'absolute bottom-24 right-4 hidden z-20'} key={Math.floor(Math.random()*Date.now())}>
                            <Picker onEmojiClick={this.handleEmojisSelect} groupNames={lang.emojisGroups} />
                        </div>
                        <div id="sender-ctn" className={'absolute w-full left-0 bottom-10 px-4'} >
                            <ContentEditable 
                                html={""}
                                data-placeholder={lang.dm.sendMessage+'...'}
                                id="msgSender"
                                onPaste={this.handlePaste.bind(this)}
                                onKeyPress={(e)=>{
                                    if(e.key == "Enter") this.sendMessage(e, this);}
                                } 
                                placeholder={lang.dm.sendMessage+'...'}
                                className={'overflow-hidden text-left shadow-input w-full bg-gray-650 h-min max-h-96 rounded-md px-4 py-2 pr-10 focus:outline-none text-gray-200'}
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
                        {/* <span className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'}>{this.props.file.name} - {(this.props.file.size / (1024*1024)).toFixed(2)}MB</span>
                        <img className={"rounded block w-full"} src={this.props.image}/> */}
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