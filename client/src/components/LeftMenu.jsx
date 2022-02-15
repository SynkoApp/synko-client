import React from 'react';
import UserButton from './UserButton';
import { Redirect } from 'react-router';
import axios from 'axios';
import {API_URL} from '../utils/APIBase';
import { renderToString } from 'react-dom/server';
import $ from 'jquery';

export default class LeftMenu extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
    }

    getGroups(){
        axios({
            url : `${API_URL}/getGroups`,
            method : "get",
            headers : {
                "Authorization" : localStorage.getItem("token")
            }
        }).then(res => {
            let groups = [];
            res.data.groups.forEach(group => {
                groups.push(<UserButton ws={this.props.ws} key={Math.floor(Math.random()*Date.now())} owner={group.owner} id={group.id} username={group.name} img={group.avatar} data-tip={group.name} />)
            })
            this.setState({ groups })
        })
    }

    componentDidMount(){
        this.getGroups()
        let { ws } = this.props;
        document.addEventListener("click", this.handleClickOutside)
        if(window.location.hash.startsWith('#/dm/')) return
        ws.onmessage = msg => {
            let data = JSON.parse(msg.data);
            if(data.type == "new_group"){
                let { group } = data;
                $("#groups-ctn").append(renderToString(<UserButton ws={this.props.ws} key={Math.floor(Math.random()*Date.now())} owner={group.owner} id={group.id} username={group.name} img={group.avatar} data-tip={group.name} />));
            };
        }
    }

    handleClickOutside(e){
        if(e.target.id.includes("ctx-menu") || e.target.classList.contains('ctx-menu-child')) return
        else {
            if(!document.querySelector(`#ctx-menu.block`)) return
            document.querySelector(`#ctx-menu.block`).classList.replace('block', 'hidden')
        }
    }

    componentWillUnmount(){
        document.removeEventListener('click', this.handleClickOutside)
    }

    render (){
        let { searchUser } = this.props;
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        return (
            <div id="left-menu" className={'overflow-auto h-full p-2 pb-6 items-center flex flex-col z-20 min-w-min w-min bg-gray-750'}>
                {this.props.toHome ? <UserButton key={Math.floor(Math.random()*Date.now())} home click={() => {this.setState({redirect : "/"})}}/> : <UserButton key={Math.floor(Math.random()*Date.now())} click={() => searchUser('flex')} newMsg/>}
                <div id="groups-ctn" className={'overflow-auto flex-grow'}>
                    {this.state.groups}
                </div>
                <UserButton settings click={() => {this.setState({ redirect: "/settings" })}}/>
            </div>
        )
    }
}