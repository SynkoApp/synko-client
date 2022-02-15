import React from 'react';
import { Redirect } from 'react-router-dom'
import { FaSearch } from 'react-icons/fa'
import { IoAdd, IoClose } from 'react-icons/io5'
import axios from 'axios'
import {API_URL} from '../utils/APIBase';
import $ from 'jquery'
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file;

export default class NewGroup extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            usersToAdd : []
        }
    }

    handleKeyPress(evt) {
        if(evt.key === 'Enter') {
            this.searchUser();
            evt.target.blur();
        }
    }

    searchUser(){
        axios({
            method : "post",
            url : `${API_URL}/getUsers`,
            headers : {
                Authorization : localStorage.getItem('token')
            },
            data : {
                query : $('#findUser').val()
            }
        }).then(res => {
            this.setState({users:res.data.users})
        }).catch(err =>{

        })
    }

    createGroup(){
        $('#grpname').removeClass('border border-red-500')
        $('#grpavatar').removeClass('border border-red-500')
        $('#findUser').removeClass('border border-red-500')
        if($('#grpname').val().trim() == ""){
            return $('#grpname').addClass('border border-red-500')
        } 
        if(!$('#grpavatar').val().trim().startsWith("http")){
            return $('#grpavatar').addClass('border border-red-500')
        }
        if(this.state.usersToAdd.length == 0){
            return $('#findUser').addClass('border border-red-500')
        }
        axios({
            method : "post",
            url : `${API_URL}/createGroup`,
            data : {
                users : this.state.usersToAdd,
                name : $('#grpname').val().trim(),
                avatar : $('#grpavatar').val().trim(),
                owner : localStorage.getItem("token")
            }
        }).then(res => {
            this.setState({redirect : `/dm/${res.data.group_id}`})
        }).catch(err => {

        })
    }

    handleEscape(evt) {
        if(evt.key == "Escape") {
            if(this.props.open == "flex") return this.props.closeMenu('hidden');
        }
    }

    render (){
        let { closeMenu } = this.props;
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        if(this.props.open == "flex") {
            window.addEventListener('keydown', this.handleEscape.bind(this))
        } else {
            window.removeEventListener('keydown', this.handleEscape.bind(this))
        }
        return (
            <div className={`${this.props.open} bg-gray-750 w-1/3 rounded shadow-custom absolute inset-auto flex flex-col items-center py-2 p-6 z-10`}>
                <h2 className={"text-gray-200 font-semibold"}>{lang.createNewGroup}</h2>
                <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='grpname'>{lang.group.name}</label>
                <div className={'w-full relative mb-4'}>
                    <input onFocus={(e) => { e.target.select() }} autoComplete={"off"} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="grpname"/>
                </div>
                <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='grpavatar'>{lang.group.avatar}</label>
                <div className={'w-full relative mb-4'}>
                    <input onFocus={(e) => { e.target.select() }} autoComplete={"off"} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="grpavatar"/>
                </div>
                <label className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'} htmlFor='findUser'>{lang.group.searchUser}</label>
                <div className={'w-full relative'}>
                    <input onFocus={(e) => { e.target.select() }} autoComplete={"off"} onKeyPress={this.handleKeyPress.bind(this)} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} id="findUser"/>
                    <FaSearch onClick={this.searchUser.bind(this)} className={'absolute right-2 bottom-2 cursor-pointer text-gray-500 hover:text-gray-300'} />
                </div>
                <div className={'flex-grow mt-2 w-full'}>
                    {this.state.users?.map(user =>
                        <div className={'hover:bg-gray-700 text-md font-semibold hover:text-gray-300 text-gray-400 flex cursor-default items-center justify-between w-full rounded p-2'} key={user.id}>
                        <div>
                            <img className={"w-8 h-8 rounded-full mr-2"} src={user.profilePic} alt={"Avatar de "+user.username}/>
                            <h2>{user.username}</h2>
                        </div>
                        {!this.state.usersToAdd?.find(u => u.id == user.id) ? <IoAdd className={'cursor-pointer hover:text-gray-100 text-xl'} onClick={()=>{
                            if(this.state.usersToAdd.indexOf(user) >= 0) return;
                            this.state.usersToAdd.push(user);
                            this.setState({ usersToAdd: this.state.usersToAdd })
                        }}/> : <IoClose onClick={() => {
                            let idx = this.state.usersToAdd.indexOf(user);
                            if(idx < 0) return;
                            this.state.usersToAdd.splice(idx, 1);
                            this.setState({usersToAdd : this.state.usersToAdd})
                        }} className={'text-xl ml-2 cursor-pointer'}/>}
                    </div>)}
                    <div className={'border-t pt-2 mt-2 border-gray-700 flex flex-wrap'}>
                        {this.state.usersToAdd?.map(user => <div key={'uta-'+user.id} className={'bg-gray-700 m-1 flex items-center cursor-default py-1 px-2 w-min rounded text-gray-200 font-semibold'}>
                            {user.username}
                            <IoClose onClick={() => {
                                let idx = this.state.usersToAdd.indexOf(user);
                                if(idx < 0) return;
                                this.state.usersToAdd.splice(idx, 1);
                                this.setState({usersToAdd : this.state.usersToAdd})
                            }} className={'text-xl ml-2 cursor-pointer'}/>
                        </div>)}
                    </div>
                </div>
                <div className={'flex w-full mt-2'}>
                    <button onClick={() => closeMenu('hidden')} className={'text-blue-500 underline'}>{lang.group.close}</button>
                    <div className={'flex-grow'}></div>
                    <button onClick={this.createGroup.bind(this)} className={'bg-green-500 font-semibold text-white rounded py-1 px-2'}>{lang.group.create}</button>
                </div>
            </div>
        )
    }
}
