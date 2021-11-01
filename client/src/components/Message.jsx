import React from 'react';
import Linkify from 'linkify-react';
import { emojify } from 'node-emoji';
import parse from 'html-react-parser';
import xssFilter from 'xss-filters';
import emojifier from '../utils/emojifier';
import UrlParser from 'js-video-url-parser';
import Player from '../components/Player';
import { HiDotsHorizontal } from 'react-icons/hi';
import { clipboard } from '../utils/electron';
import { API_URL } from '../utils/APIBase';
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.message;

export default class Message extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
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

    render (){
        let attachments = [];
        for (let i = 0; i < this.props.message.attachments; i++) {
            attachments.push(i+1);
        }
        let video = this.isContainVideo(this.props.children.replace('?t', '#t'));
        return (
            <div id={'msg-'+this.props.message.id} className={'group w-full flex bg-gray-700 hover:bg-gray-650 mb-2 p-2 pl-4 items-start relative z-0 hover:z-10'}>
                <img alt={`${this.props.author?.username}'s profile avatar`} className={'rounded-full w-10 h-10 mr-2 cursor-pointer'} src={API_URL+'/proxy/i?url='+this.props.author?.profilePic}/>
                <div className={'flex flex-col w-full'}>
                    <h2 className={'text-blue-500 font-medium'}>{this.props.author?.username} <span className={'ml-2 font-normal text-gray-500 text-sm'}>{new Date(this.props.message.date).toLocaleString()}</span></h2>
                    <Linkify className={'text-gray-300 flex-grow break-all pr-10'+(this.isOnlyEmojis(emojify(this.props.children))?" text-2xl":"")} tagName="p" options={{className:"text-blue-400 hover:underline", rel: 'noreferrer', truncate: 32, target: "_blank", format: {
                        url: (value) => value.length > 32 ? value.slice(0, 32) + '…' : value
                    }}}>{parse(emojifier(xssFilter.inHTMLData(this.props.children), this.isOnlyEmojis(emojify(this.props.children))))}</Linkify>
                    <div className={'h-max w-11/12 max-w-full'}>
                        {attachments.map(a =>
                            <img key={Math.floor(Math.random() * Date.now())} className={'rounded inline-block max-h-64 max-w-96 mr-3 mb-3 min-h-24 min-w-48 bg-gray-650 animate-bg-pulse'} src={`${API_URL}/attachments/${this.props.groupId}/${this.props.message.id}/${a}`}/>
                        )}                        
                    </div>
                    {video ? <Player video={video}/> : ""}
                </div>
                <div className={'w-8 flex justify-right flex-grow right-0 float-right top-2 z-50 sticky'}>
                    <button className={'text-white btn-dropdown group-hover:block hidden'}><HiDotsHorizontal/></button>
                    <ul className={'rounded absolute msg-dropdown p-1 right-0 top-0 bg-gray-750 z-50 min-w-48 text-gray-300 text-center hidden'}>
                        <li><button onClick={() => {clipboard.writeText(this.props.children, "clipboard")}} className={'p-1 w-full rounded hover:bg-gray-600'}>{lang.copy_text}</button></li>
                        <li onClick={() => {clipboard.writeText(`${this.props.message.id}`, "clipboard")}} className={'p-1 w-full rounded hover:bg-gray-600 cursor-pointer'}>{lang.copy_id}</li>
                        {localStorage.getItem('id') == this.props.author?.id ? 
                            <li className={'border-t mt-1 pt-1 border-gray-600'}><button onClick={() => {this.props.deleteMsg(this.props.message.id)}} className={'p-1 w-full rounded text-red-500 hover:text-gray-300 hover:bg-red-500'}>{lang.delete_message}</button></li>
                        : <></>}
                    </ul>
                </div>
            </div>
        )
    }
}