import React from 'react';
import $ from "jquery";
import { ipcRenderer } from '../utils/electron';

export default class Notifications extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            downloading: "",
            id: ""
        }
    }

    componentDidMount() {
        ipcRenderer.on('notification', (evt, data) => {
            let id = `notif-${Math.floor(Math.random()*Date.now())}`;
            $("#notifications").append(`<div id="${id}" class="animate__animated animate__backInRight px-5 py-2 bg-blue-500 bg-opacity-50 rounded text-gray-200 font-semibold shadow-md mb-4">
                ${data}
                <div class="notif-loader"></div>
            </div>`)
            
            setTimeout(() => {
                $(`#${id}`).addClass("animate__animated animate__backOutRight");
                setTimeout(()=>$(`#${id}`).animate({height: '0', marginBottom: '-=1rem'}, 500, "linear", function(){$(this).hide(500)}),700);
            }, 10000);
        });
    }


    render (){
        return (
            <div className={'fixed top-10 right-5 transition-all z-50'} id="notifications">
                <div class="animate__animated animate__backInRight px-5 py-2 bg-blue-500 bg-opacity-50 rounded text-gray-200 font-semibold shadow-md mb-4" id={this.state.id}>{this.state.downloading}</div>
            </div>
        )
    }
}