import React from 'react';
import LeftMenu from "../components/LeftMenu";
import { checkToken } from '../utils/functions';
import { Redirect } from 'react-router-dom'
import Welcome from "../img/welcome.webp"
import Waves from '../components/Waves';
import {WS_URL} from '../utils/APIBase';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import NewGroup from '../components/NewGroup';
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file;

export default class Home extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            searchUserDisplay:  "hidden",
            socket: null,
            wsIsOpened: false
        }
    }

    async componentDidMount(){
        if(localStorage.getItem('username') && localStorage.getItem('token')){
            let tknValidation = await checkToken(localStorage.getItem('token'), localStorage.getItem('username'))
            if(tknValidation.status === 200){
                if(!localStorage.getItem('language')) localStorage.setItem('language', 'en');
                const connect = () => {
                    let ws = new W3CWebSocket(WS_URL);
                    this.setState({ socket: ws });
                    ws.onopen = () => {
                        this.setState({wsIsOpened: true})
                        ws.send(JSON.stringify({token:localStorage.getItem('token'), type:"connection"}))
                        console.log("WebSocket: Connected")
                    }

                    ws.onmessage = msg => {
                        let data = JSON.parse(msg.data);
                        if(data.type == "admin_disconnect"){
                            // Ici ca fait rien j'sais pas pourquoi
                        }
                    }
                    
                    ws.onclose = () => {
                        this.setState({wsIsOpened: false})
                        console.log('WebSocket: Disconnected. Reconnect will be attempted in 1 second.')
                        setTimeout(() => {
                            if(window.location.hash !== "#/") return;
                            connect();
                        }, 1000);
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

    userSearching (arg){
        this.setState({searchUserDisplay : arg})
    }

    render (){
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        if(!this.state.wsIsOpened) return <></>;
        return (
                <div className={'overflow-auto h-full flex bg-gray-700'}>
                    <LeftMenu ws={this.state.socket} searchUser={this.userSearching.bind(this)} key={Math.floor(Date.now()*Math.random())}/>
                    <div className={'flex flex-wrap flex-grow z-10 justify-center items-center'}>
                        <h1 className={'text-5xl w-full -mb-12 text-center font-semibold text-white'}>Welcome to Synko !</h1>
                        <div className={'flex -mt-32'}>
                            <div classame={'flex-col items-center'}>
                            <img alt="Welcome shiba" className={'w-64'} src={Welcome} />
                            </div>
                            <div className={'flex flex-col ml-6 justify-center text-gray-200'}>
                                <h2 className={'text-white text-lg font-medium'}>{lang.home.hey[0]} {localStorage.getItem('username')} {lang.home.hey[1]}</h2>
                                <p>{lang.home.exp[0]}</p>
                                <p>{lang.home.exp[1]}</p>
                            </div>
                        </div>
                        <NewGroup closeMenu={this.userSearching.bind(this)} open={this.state.searchUserDisplay} />
                    </div>
                    <Waves 
                        className={'absolute w-full bottom-0 z-0'}
                        firstWave={{color1 : "rgba(52, 162, 203, 1)", color2 : "rgba(75, 77, 205, 1)"}}
                        secondWave={{color1 : "rgba(0, 0, 0, .8)", color2 : "rgba(0, 0, 0, .8)"}}
                        thirdWave={{color1 : "rgba(75, 77, 205, 1)", color2 : "rgba(75, 77, 205, 1)"}}
                    />
                </div>
        )
    }
}