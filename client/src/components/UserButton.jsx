import React from 'react';
import { AiOutlinePlus, AiOutlineHome } from 'react-icons/ai'
import { BiCog } from 'react-icons/bi'
import ReactTooltip from 'react-tooltip'
import { Redirect } from 'react-router-dom'
import { API_URL } from '../utils/APIBase'
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.delete_group;

export default class UserButton extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            ctxMenu : {
                isOpened : false
            }
        }
    }

    render (){
        if(this.state.redirect && `#${this.state.redirect}` !== window.location.hash && !this.props.newMsg){
            return <Redirect to={this.state.redirect}/>
        }
        return (
            <div onClick={()=>{this.props.click ? this.props.click() : this.setState({redirect : `/dm/${this.props.id}`})}} className={`rounded-full cursor-pointer mb-2 flex items-center justify-center h-12 w-12 min-h-12 max-h-12 bg-gray-800 ${window.location.hash == `#/dm/${this.props.id}` ? ' border-2 border-blue-500' : ''}`}>
                {this.props.newMsg ? <AiOutlinePlus className={'text-3xl text-green-600'}/> : this.props.home ? <AiOutlineHome className={'text-3xl text-green-600'}/> : this.props.settings ? <BiCog className={"text-3xl text-green-600"} /> :
                <div onContextMenu={(e)=>{if(document.querySelector('#ctx-menu.block')){document.querySelector('#ctx-menu.block').classList.replace('block', 'hidden')};this.setState({ctxMenu: {isOpened: true, group: this.props.id, top: e.clientY, owner: this.props.owner}})}}>
                    <img data-tip={this.props.newMsg ? lang.newMsgGroup : this.props.settings ? lang.settings : this.props.username} className={"rounded-full h-avatar w-avatar"} alt="" src={API_URL+'/proxy/i?url='+this.props.img}/>  
                    <CtxMenu ws={this.props.ws} {...this.state.ctxMenu} />
                </div>}
                <ReactTooltip className={'font-semibold text-5xl'} backgroundColor="rgba(17, 24, 39, 1)" effect="solid" place="right"/>
            </div>
        )
    }
}

class CtxMenu extends React.Component {
    constructor(props){
        super(props)
    }

    deleteGroup(){
        this.props.ws.send(JSON.stringify({
            type: "delete_group",
            token: localStorage.getItem('token'),
            group: this.props.group
        }))
    }

    render(){
        return (
            <ul key={Date.now()} id={`ctx-menu`} style={{top: this.props.top-18||0}} className={`${this.props.isOpened && this.props.owner == localStorage.getItem('id') ? "block" : "hidden"} cursor-default rounded absolute msg-dropdown p-1 left-16 bg-gray-800 z-50 min-w-48 text-gray-300 text-center`}>
                <li className={'cursor-pointer ctx-menu-child'}><button onClick={this.deleteGroup.bind(this)} className={'ctx-menu-child p-1 w-full rounded text-red-500 hover:text-gray-300 hover:bg-red-500'}>{lang}</button></li>
            </ul>
        )
    }
}
