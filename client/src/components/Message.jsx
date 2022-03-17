import React from 'react';
import Linkify from 'linkify-react';
import { emojify } from 'node-emoji';
import parse from 'html-react-parser';
import $ from 'jquery';
import axios from 'axios';
import xssFilter from 'xss-filters';
import emojifier from '../utils/emojifier';
import UrlParser from 'js-video-url-parser';
import Player from './Player';
import { HiDotsHorizontal } from 'react-icons/hi';
import { FaCrown, FaBug, FaTools } from 'react-icons/fa'
import { clipboard } from '../utils/electron';
import { API_URL } from '../utils/APIBase';
import Embed from './Embed'
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.message;


export default class Message extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            links: []
        }
        this.links = []
        this.icons = {
            admin: <FaTools className='ml-2 text-blue-500' key={Math.random()*Date.now()}/>,
            bughunter: <FaBug className='ml-2 text-green-500' key={Math.random()*Date.now()}/>,
            bigbughunter: <FaBug className='ml-2 text-cyan-300' key={Math.random()*Date.now()}/>
        }
    }

    isOnlyEmojis(string) {
        let emoji_regex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/;
        return emoji_regex.test(string);
    }

    isContainVideo(string) {
        let regex = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s\?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s\?]+)/g;
        let found = string.match(regex);
        if(found) return UrlParser.parse(found[0].replace(/\?t/g, "#t")); 
        else return false;
    }

    isContainPad(string) {
        let regex = /(https?):\/\/genopad.xyz\/embed\/([A-z]|[0-9]){8}/g;
        let found = string.match(regex);
        if(found) return found[0];
        else return false;
    }

    deleteMsg() {
        this.props.deleteMsg(this.props.message.id);
    }

    render (){
        let attachments = [];
        if(this.props.message.attachments) {
            for (let i = 0; i < this.props.message.attachments; i++) {
                attachments.push(i+1);
            }            
        }

        let video;
        let pad;
        if(typeof this.props.children == "string"){
            video = this.isContainVideo(this.props.children.replace('?t', '#t'));
            pad = this.isContainPad(this.props.children);
        }
        let links = this.props.message.links;
        return (
            <div id={'msg-'+this.props.message.id} className={'group w-full flex bg-gray-700 hover:bg-gray-650 mb-2 p-2 pl-4 items-start relative z-0 hover:z-10'}>
                <img alt={`${this.props.author?.username}'s profile avatar`} className={'rounded-full w-10 h-10 mr-2 cursor-pointer'} src={API_URL+'/proxy/i?url='+this.props.author?.profilePic}/>
                <div className={'flex flex-col w-full'}>
                    <h2 className={'text-blue-500 font-medium flex items-end'}><span className='hover:underline cursor-pointer flex items-center'>{this.props.author?.username}{this.props.isOwner ? <FaCrown className='ml-2 text-yellow-500' /> : ""}{this.props.author?.badges.map(b => this.icons[b])}</span><span className={'ml-2 font-normal text-gray-500 text-sm'}>{new Date(this.props.message.date).toLocaleString()}</span></h2>
                    <Linkify className={'text-gray-300 flex-grow break-all pr-10'+(this.isOnlyEmojis(emojify(this.props.children))?" text-2xl":"")} tagName="p" options={{className:"text-blue-400 hover:underline", rel: 'noreferrer', truncate: 32, target: "_blank", nl2br: true, format: {
                        url: (value) => value.length > 32 ? value.slice(0, 32) + '…' : value
                    }}}>{parse(emojifier(xssFilter.inHTMLData(this.props.children)/*.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;')*/, this.isOnlyEmojis(emojify(this.props.children))))}</Linkify>
                    {attachments.length > 0 ? <div className={'h-max w-11/12 max-w-full'}>
                        {attachments.map(a =>
                            <img key={Math.floor(Math.random() * Date.now())} className={'rounded inline-block max-h-64 max-w-96 mr-3 mb-3 min-h-24 min-w-48 bg-gray-650 animate-bg-pulse'} src={`${API_URL}/attachments/${this.props.groupId}/${this.props.message.id}/${a}`}/>
                        )}             
                    </div> : ""}
                    {video ? <Player video={video}/> : ""}
                    {pad ? <iframe src={pad} height={350} width={550} className={'rounded'} frameBorder={0}></iframe> : ""}
                    {links ? <Embed links={links}/> : ""}
                </div>
                <div className={'w-8 flex justify-right flex-grow right-0 float-right top-2 z-50 sticky'}>
                    <button className={'text-white btn-dropdown group-hover:block hidden'}><HiDotsHorizontal/></button>
                    <ul className={'rounded absolute msg-dropdown p-1 right-0 top-0 bg-gray-750 z-50 min-w-48 text-gray-300 text-center hidden'}>
                        <li className={'cpy-btn'}><button onClick={() => {clipboard.writeText(this.props.children, "clipboard")}} className={'p-1 w-full rounded hover:bg-gray-600'}>{lang.copy_text}</button></li>
                        <li className={'cid-btn'}><button onClick={() => {clipboard.writeText(`${this.props.message.id}`, "clipboard")}} className={'p-1 w-full rounded hover:bg-gray-600'}>{lang.copy_id}</button></li>
                        {(localStorage.getItem('id') == this.props.author?.id || this.props.isAdmin) ? 
                            <li className={'dlt-btn border-t mt-1 pt-1 border-gray-600'}><button onClick={this.deleteMsg.bind(this)} className={'p-1 w-full rounded text-red-500 hover:text-gray-300 hover:bg-red-500'}>{lang.delete_message}</button></li>
                        : <></>}
                    </ul>
                </div>
            </div>
        )
    }
}

//BiCheckShield



//U2FsdGVkX18HkjQoDNK7qfAsUrZ7K4J7Zx5hwrYBBUw=
//1451150422