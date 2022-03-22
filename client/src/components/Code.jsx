import React from 'react';
import { HiDotsHorizontal, HiBan } from 'react-icons/hi';
import { clipboard } from '../utils/electron';
import { API_URL } from '../utils/APIBase';
import IDE from 'react-ace';
import { FaCrown, FaBug, FaTools } from 'react-icons/fa';
import { BiTestTube } from 'react-icons/bi';

let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.message;

export default class Code extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
        this.icons = {
            admin: <FaTools className='ml-2 text-blue-500' key={Math.random()*Date.now()}/>,
            bughunter: <FaBug className='ml-2 text-green-500' key={Math.random()*Date.now()}/>,
            bigbughunter: <FaBug className='ml-2 text-cyan-300' key={Math.random()*Date.now()}/>,
            banned: <HiBan className='ml-2 text-red-500' key={Math.random()*Date.now()}/>,
            tester: <BiTestTube className='ml-2 text-orange-400' key={Math.random()*Date.now()}/>
        }
    }

    deleteMsg() {
        this.props.deleteMsg(this.props.message.id);
    }

    parseCode(p){
        let code = p;
        code = code.replaceAll('\`\`\`', '');
        let ncode = code.split('\n');
        ncode.splice(0,1);
        try {
            require(`ace-builds/src-min-noconflict/mode-${code.split('\n')[0]}`)
            require('ace-builds/src-min-noconflict/theme-tomorrow_night')
            return <IDE mode={code.split('\n')[0]} theme={'tomorrow_night'} style={{height: "200px", width: "550px", borderRadius:"5px"}} setOptions={{useWorker:false}} readOnly value={ncode.join('\n')} />
        } catch {
            return <p className={'text-gray-300 flex-grow break-all pr-10'}>{this.props.children}</p>
        }
    }

    getCode(p) {
        let code = p;
        code = code.replaceAll('\`\`\`', '');
        let ncode = code.split('\n');
        ncode.splice(0,1);
        return ncode.join('\n');
    }

    render (){
        return (
            <div id={'msg-'+this.props.message.id} className={'group w-full flex bg-gray-700 hover:bg-gray-650 mb-2 p-2 pl-4 items-start relative z-0 hover:z-10'}>
                <img alt={`${this.props.author?.username}'s profile avatar`} className={'rounded-full w-10 h-10 mr-2 cursor-pointer'} src={API_URL+'/proxy/i?url='+this.props.author?.profilePic}/>
                <div className={'flex flex-col w-full'}>
                    <h2 className={'text-blue-500 font-medium flex items-end mb-2'}><span className='hover:underline cursor-pointer flex items-center'><span className={`${this.props.author?.badges.includes("banned") ? "text-red-500 line-through" : ""}`}>{this.props.author?.username}</span>{this.props.isOwner ? <FaCrown className='ml-2 text-yellow-500' /> : ""}{this.props.author?.badges.map(b => this.icons[b])}</span><span className={'ml-2 font-normal text-gray-500 text-sm'}>{new Date(this.props.message.date).toLocaleString()}</span></h2>
                    {this.parseCode(this.props.children)}
                </div>
                <div className={'w-8 flex justify-right flex-grow right-0 float-right top-2 z-50 sticky'}>
                    <button className={'text-white btn-dropdown group-hover:block hidden'}><HiDotsHorizontal/></button>
                    <ul className={'rounded absolute msg-dropdown p-1 right-0 top-0 bg-gray-750 z-50 min-w-48 text-gray-300 text-center hidden'}>
                        <li className={'cpy-btn'}><button onClick={() => {clipboard.writeText(this.getCode(this.props.children), "clipboard")}} className={'p-1 w-full rounded hover:bg-gray-600'}>{lang.copy_code}</button></li>
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