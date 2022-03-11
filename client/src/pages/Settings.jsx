import React from 'react';
import { Redirect } from 'react-router-dom'
import axios from 'axios';
import {API_URL, WS_URL} from '../utils/APIBase';
import LeftMenu from '../components/LeftMenu'
import { MdModeEdit } from 'react-icons/md';
import { CgClose } from 'react-icons/cg'
import { checkToken, checkUpdate } from '../utils/functions';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import pkg from "../../package.json";
import { ipcRenderer } from '../utils/electron';
let langs = require('../languages/lang.config').default;

export default class Settings extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            profilePicEnabled: false,
            wsIsOpened: false
        }
    }

    async componentDidMount() {
        if(localStorage.getItem('username') && localStorage.getItem('token')){
            let tknValidation = await checkToken(localStorage.getItem('token'), localStorage.getItem('username'))
            if(tknValidation.status === 200){
                const connect = () => {
                    let ws = new W3CWebSocket(WS_URL);
                    this.setState({ socket: ws });
                    ws.onopen = () => {
                        this.setState({wsIsOpened: true})
                        ws.send(JSON.stringify({token:localStorage.getItem('token'), type:"connection"}))
                        console.log("WebSocket: Connected")
                    }
                    ws.onmessage = msg => {
                    }
                    ws.onclose = () => {
                        console.log('WebSocket: Disconnected. Reconnect will be attempted in 1 second.')
                        setTimeout(() => {
                            if(window.location.hash !== "#/settings") return;
                            connect();
                        }, 1000);
                        this.setState({wsIsOpened: false})
                    }

                    ws.onerror = (err) => {
                        console.error('WebSocket: Error. ', err.message, 'Closing socket')
                        ws.close();
                    };
                }
                return connect();
            }
        }
        this.setState({redirect : "/login"})
    }

    componentWillUnmount() {
        this.state.socket?.close();
    }

    setParentState(param) {
        this.setState(param)
    }

    render (){
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        if(!this.state.wsIsOpened) return <></>;

        return (
            <div className={'overflow-auto h-full flex bg-gray-700'}>
                <LeftMenu ws={this.state.socket} toHome key={Math.floor(Date.now()*Math.random())}/>
                <div className={'flex-grow flex items-center justify-center relative'}>
                    <div className={'flex-grow flex-col flex items-start h-full p-2'}>
                        <Profile setParentState={this.setParentState.bind(this)} key={Date.now()}/> 
                        <Languages setParentState={this.setParentState.bind(this)}/>
                        <Update/>
                        <Logout/>
                    </div>
                    <ProfilePicModal open={this.state.profilePicEnabled?"block":"hidden"} setParentState={this.setParentState.bind(this)}/>
                </div>
            </div>
        )
    }
}

class Profile extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            user: {},
            baseUser: {},
            socket: null,
            usernameEnabled: false,
        }
    }

    reset() {
        this.setState({
            user: this.state.baseUser
        })
    }

    handleChange(evt) {
        evt.preventDefault();
        this.setState(prevState => ({
            user: {
                ...prevState.user,
                [evt.target.id]: evt.target.value || ''
            }
        }));
    }

    async handleEnable(target, mode) {
        await this.setState({
            [target+"Enabled"]: !this.state[`${target}Enabled`]
        });
        if(mode == "reset") document.querySelector('#username').value = localStorage.getItem('username')
        document.getElementById(target).focus();
    }

    updateUser(){
        document.querySelector('#upassword').classList.remove('border','border-red-500')
        document.querySelector('#err').classList.add('hidden')
        document.querySelector('#success').classList.add('hidden')
        if(!document.querySelector('#upassword').value.trim()) return document.querySelector('#upassword').classList.add('border','border-red-500')
        axios({
            method : "patch",
            url : `${API_URL}/users/@me`,
            headers : {
                Authorization : localStorage.getItem('token'),
            },
            data : {
                user : {
                    username : document.querySelector('#username').value
                },
                password : document.querySelector('#upassword').value
            }
        }).then((res) => {
            localStorage.setItem('token', res.data.token)
            localStorage.setItem('username', document.querySelector('#username').value)
            document.querySelector('#success').classList.remove('hidden')
        }).catch(err => {
            if(err.response.data.message == "Wrong credentials") document.querySelector('#upassword').classList.add('border','border-red-500')
            else document.querySelector('#err').classList.remove('hidden')
        })
    }

    componentDidMount(){
        axios.get(`${API_URL}/users/@me`, {
            headers: {
                Authorization: `${localStorage.getItem('token')}`
            }
        }).then(res => {
            const { data } = res;
            this.setState({user: data})
        }).catch(err => {
            console.log(err);
        });
    }

    render(){
        let { user } = this.state
        return (
            <div className={'w-full h-64 rounded text-gray-300 bg-gray-650 flex items-start p-5'}>
                {user?.username != null ? <>
                    <div className={"relative w-32 h-32 rounded-full"}>
                        <img className={"rounded-full w-32 h-32"} src={user.profilePic == "" ? "https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png" : "https://proxy.duckduckgo.com/iu/?u="+user.profilePic} alt="Your avatar" />
                        <div onClick={() => this.props.setParentState({profilePicEnabled: true})} className={"flex w-32 h-32 absolute top-0 left-0 opacity-0 cursor-pointer hover:opacity-100 items-center justify-center rounded-full bg-black bg-opacity-30"}>
                            <MdModeEdit className={"text-4xl text-white"}/>
                        </div>
                    </div>
                    <div className={"ml-5"}>
                        <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='username'>{langs[localStorage.getItem('language')]?.file.username}</label>
                        <div className={'w-full relative mb-4 flex items-center'}>
                            <input onChange={this.handleChange.bind(this)} onFocus={(e) => { e.target.select() }} maxLength={32} autoComplete={"off"} className={'bg-gray-700 text-gray-200 mt-1 text-3xl px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} value={user.username} disabled={!this.state.usernameEnabled} id="username"/>
                            {!this.state.usernameEnabled?<MdModeEdit onClick={() => {this.handleEnable('username')}} className={"text-4xl ml-2 cursor-pointer text-gray-200 hover:text-blue-500"}/>:<CgClose onClick={() => {this.handleEnable('username', 'reset')}} className={"text-4xl ml-2 cursor-pointer text-gray-200 hover:text-blue-500"}/>}
                        </div>
                        {this.state.usernameEnabled?<>
                            <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='upassword'>{langs[localStorage.getItem('language')]?.file.password}</label>
                            <div className={'w-full relative mb-4 flex items-center'}>
                                <input onFocus={(e) => { e.target.select() }} type={"password"} autoComplete={"off"} className={'bg-gray-700 text-gray-200 mt-1 text-xl px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="upassword"/>
                            </div>
                            <div className={'flex justify-end'}>
                                <button onClick={this.reset.bind(this)} className={"text-red-500 hover:underline"}>{langs[localStorage.getItem('language')]?.file.reset}</button>
                                <button onClick={this.updateUser.bind(this)} className={"bg-green-400 px-5 py-2 ml-6 text-white rounded hover:bg-green-500"}>{langs[localStorage.getItem('language')]?.file.save}</button>
                            </div>
                        </>:<></>}
                        <small id="err" className={'hidden text-red-500'}>{langs[localStorage.getItem('language')]?.file.error}</small>
                        <small id="success" className={'hidden text-green-500'}>{langs[localStorage.getItem('language')]?.file.success}</small>
                    </div>
                </>:<></>}
            </div>
        )
    }
}

class ProfilePicModal extends React.Component {

    updatePP(){
        document.querySelector('#ext_err').classList.add('hidden')
        document.querySelector('#pp_err').classList.add('hidden')
        let newPP = document.querySelector('#profilePic').value
        let exts = ["png", "jpg", "jfif", "gif", "webp"]
        if(exts.includes(newPP.split('.').pop())){
            axios({
                method : "patch",
                url : `${API_URL}/users/@me`,
                headers : {
                    Authorization : localStorage.getItem('token'),
                },
                data : {
                    user : {
                        profilePic : document.querySelector('#profilePic').value
                    },
                }
            }).then(() => {
                this.props.setParentState({profilePicEnabled: false})
            }).catch(err => {
                document.querySelector('#pp_err').classList.remove('hidden')
            })
        } else return document.querySelector('#ext_err').classList.remove('hidden')
    }

    render(){
        return(
            <div className={`${this.props.open} bg-gray-750 w-1/3 rounded shadow-custom absolute inset-auto flex flex-col items-center py-2 p-6 z-10`}>
                <h2 className={"text-gray-200 font-semibold"}>{langs[localStorage.getItem('language')]?.file.changeProfilePic}</h2>
                <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='grpname'>URL</label>
                <div className={'w-full relative mb-4'}>
                    <input onFocus={(e) => { e.target.select() }} autoComplete={"off"} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="profilePic"/>
                    <small id="pp_err" className={"hidden text-red-500"}>{langs[localStorage.getItem('language')]?.file.error}</small>
                    <small id="ext_err" className={"hidden text-red-500"}>{langs[localStorage.getItem('language')]?.file.invalidExt} ({["png", "jpg", "jfif", "gif", "webp"].join(', ')})</small>
                </div>
                <div className={'flex w-full mt-2'}>
                    <button onClick={() => this.props.setParentState({profilePicEnabled:false})} className={'text-blue-500 underline'}>{langs[localStorage.getItem('language')]?.file.closeCode}</button>
                    <div className={'flex-grow'}></div>
                    <button onClick={this.updatePP.bind(this)} className={'bg-green-500 font-semibold text-white rounded py-1 px-2'}>{langs[localStorage.getItem('language')]?.file.apply}</button>
                </div>
            </div>
        )
    }
}

class Languages extends React.Component {
    constructor(props){
        super(props)
    }

    handleLangChange(){
        localStorage.setItem('language',document.querySelector('#langSelect').value)
        //this.props.setParentState({reload : true})
        window.location.reload();
    }

    render(){
        let userLang = localStorage.getItem('language')
        return(
            <div className={'w-full mt-2 h-32 flex-col rounded text-gray-300 bg-gray-650 flex items-start p-5'}>
                <h2 className={"text-gray-200 font-semibold"}>{langs[localStorage.getItem('language')]?.file.selectLang}</h2>
                <select id="langSelect" onChange={this.handleLangChange.bind(this)} className={'bg-gray-700 p-1 text-xl focus:outline-none focus:ring-2 rounded'}>
                    {
                        langs.all.map(lang => {
                            return <option key={Math.floor(Math.random()*Date.now())} value={langs[lang]?.short} selected={langs[lang]?.short == userLang}>{langs[lang]?.full}</option>
                        })
                    }
                </select>
            </div>
        )
    }
}

class Update extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            updateAvailable: false
        }
    }

    async componentDidMount() {
        this.checkUpdate();
    }

    async checkUpdate() {
        let update = await checkUpdate();
        this.setState({
            updateAvailable: update
        });
    }

    update() {
        ipcRenderer.send('update-request');
    }

    render() {
        return (
            <div className={'w-full mt-2 h-32 flex-col rounded text-gray-300 bg-gray-650 flex items-start p-5'}>
                <h2 className={"text-gray-200 font-semibold"}>{langs[localStorage.getItem('language')]?.file.update.checkupdate}</h2>
                {this.state.updateAvailable ?
                    <button onClick={this.update} className="bg-green-500 px-5 py-2 mt-3 text-white rounded hover:bg-emerald-600">{langs[localStorage.getItem('language')]?.file.update.outofdate} (v{this.state.updateAvailable.version})</button>    
                :
                    <button className="px-5 py-2 mt-3 text-white rounded border-2 opacity-50 cursor-not-allowed">{langs[localStorage.getItem('language')]?.file.update.uptodate} (v{pkg.version})</button>}
            </div>
        )
    }
}

class Logout extends React.Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    logout(){
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        localStorage.removeItem('id')
        this.setState({redirect: "login"})
    }

    render() {
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        return (
            <div className={'w-full mt-2 h-32 flex-col rounded text-gray-300 bg-gray-650 flex items-start p-5'}>
                <h2 className={"text-gray-200 font-semibold"}>{langs[localStorage.getItem('language')]?.file.login.logout}</h2>
                <button onClick={this.logout.bind(this)} className="bg-red-500 px-5 py-2 mt-3 text-white rounded hover:bg-red-600">{langs[localStorage.getItem('language')]?.file.login.logout}</button>    
            </div>
        )
    }
}