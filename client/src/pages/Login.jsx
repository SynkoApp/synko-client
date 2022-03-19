import React from 'react';
import Waves from '../components/Waves'
import EatingShiba from '../img/eating_shiba.webp'
import { Link, Redirect } from 'react-router-dom'
import { FaEyeSlash } from "react-icons/fa";
import $ from 'jquery'
import axios from 'axios';
import {API_URL} from '../utils/APIBase';
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.login;

export default class Login extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
    }

    toggleType(){
        let type = $('input[name="password"]').attr("type")
        if(type === "password"){
            return $('input[name="password"]').attr('type', "username")
        }
        $('input[name="password"]').attr('type', "password")
    }

    componentDidMount() {
        let _lang = localStorage.getItem('language') || "en";
        localStorage.clear();
        localStorage.setItem('language', _lang);
    }

    login(e){
        e.preventDefault()
        $('#error').addClass('hidden').text('')
        $('input[name="username"]').removeClass('border').removeClass('border-red-500')
        $('label[for="username"]').removeClass('text-red-500')
        $('input[name="password"]').removeClass('border').removeClass('border-red-500')
        $('label[for="password"]').removeClass('text-red-500')
        let userInfos = {
            username : $('input[name="username"]').val(),
            password : $('input[name="password"]').val()
        }
        if(!userInfos.username || !userInfos.password){
            $('input[name="username"]').addClass('border').addClass('border-red-500')
            $('label[for="username"]').addClass('text-red-500')
            $('input[name="password"]').addClass('border').addClass('border-red-500')
            $('label[for="password"]').addClass('text-red-500')
            return 
        }
        axios({
            url : `${API_URL}/login`,
            method : 'POST',
            data : userInfos
        }).then(res => {
            if(res.data.code === "OK" && res.data.token){
                localStorage.setItem('token', res.data.token)
                localStorage.setItem('username', userInfos.username)
                localStorage.setItem("id", res.data.id)
                this.setState({redirect : "/"})
            } else $('#error').removeClass('hidden').text('An error occured, please try again later')
        }).catch(err => {
            if(err.response.status === 404 || err.response.status === 403 || err.response.status === 401){
                $('input[name="username"]').addClass('border').addClass('border-red-500')
                $('label[for="username"]').addClass('text-red-500')
                $('input[name="password"]').addClass('border').addClass('border-red-500')
                $('label[for="password"]').addClass('text-red-500')
                $('#error').removeClass('hidden').text(err.response.data.message)
            } else {
                $('#error').removeClass('hidden').text('An error occured, please try again later')
            }
        })

    }

    render (){
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}></Redirect>
        }
        return (
                <div className={'overflow-hidden h-full w-full justify-center items-center flex bg-gray-700'}>
                    <form className={'bg-gray-750 rounded shadow-md absolute inset-auto flex flex-col items-center p-6 z-10'}>
                        <img alt='Eating shiba' className={'absolute -left-10 -top-12 select-none'} width={'100px'} src={EatingShiba}/>
                        <h1 className={'text-white text-2xl mb-2'}>{lang.welcome}</h1>
                        <p className={'text-gray-400'}>{lang.creds}</p>
                        <fieldset className={'flex flex-col m-6 mb-2 w-full'}>
                            <label className={'uppercase text-gray-400 text-xxs font-semibold'} htmlFor='username'>{lang.username}</label>
                            <input className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} name="username"/>
                        </fieldset>
                        <fieldset className={'flex flex-col relative m-6 mb-2 w-full'}>
                            <label className={'uppercase text-gray-400 text-xxs font-semibold'} htmlFor='password'>{lang.password}</label>
                            <input type={'password'} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} name="password"/>
                            <FaEyeSlash onClick={this.toggleType} className={'absolute right-2 top-7 cursor-pointer text-gray-400 hover:text-gray-200'}/>
                            <Link className={'text-sm hover:underline w-max text-blue-500'} to='/forgotPassword'>{lang.forgot}</Link>
                        </fieldset>
                        <fieldset className='flex flex-col mt-6 w-full'>
                            <button onClick={this.login.bind(this)} className={'w-full hover:bg-blue-600 bg-blue-500 rounded p-1 font-medium text-gray-200'}>{lang.login_btn}</button>
                            <Link className={'text-sm hover:underline w-max text-blue-500'} to='/register'>{lang.register_link}</Link>
                        </fieldset>
                        <small className={'text-red-500 hidden'} id="error"></small>
                    </form>
                    <Waves 
                        className={'absolute bottom-0 z-0'}
                        firstWave={{color1 : "rgba(52, 162, 203, 1)", color2 : "rgba(75, 77, 205, 1)"}}
                        secondWave={{color1 : "rgba(0, 0, 0, .8)", color2 : "rgba(0, 0, 0, .8)"}}
                        thirdWave={{color1 : "rgba(75, 77, 205, 1)", color2 : "rgba(75, 77, 205, 1)"}}
                    />
                </div>
        )
    }
}