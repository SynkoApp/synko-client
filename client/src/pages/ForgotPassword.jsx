import React from 'react';
import Waves from '../components/Waves'
import EatingShiba from '../img/eating_shiba.webp'
import { Redirect, Link } from 'react-router-dom'
import { VscLoading, VscArrowLeft } from 'react-icons/vsc'
import { FaEyeSlash } from "react-icons/fa";
import $ from 'jquery'
import axios from 'axios';
import {API_URL} from '../utils/APIBase';
let lang = require('../languages/lang.config').default[localStorage.getItem('language')||"en"]?.file.forgotPw;


export default class ForgotPassword extends React.Component {
    constructor(props){
        super(props)
        this.state = {}
    }

    componentDidMount(){
        document.querySelectorAll('.tohide').forEach(e => {
            e.classList.add('hidden')
        })
        let in1 = document.getElementById('otc-1'),
            ins = document.querySelectorAll('.digit input[type="number"]'),
            splitNumber = function(e) {
                let data = e.data || e.target.value;
                if ( ! data ) return;
                if ( data.length === 1 ) return;
                popuNext(e.target, data);
            },
            popuNext = function(el, data) {
                el.value = data[0];
                data = data.substring(1);
                if ( el.nextElementSibling && data.length ) {
                    popuNext(el.nextElementSibling, data);
                }
            };

        ins.forEach(function(input) {
            input.addEventListener('keyup', function(e){
                if(e.keyCode === 16 || e.keyCode == 9 || e.keyCode == 224 || e.keyCode == 18 || e.keyCode == 17) {
                    return;
                }
                
                if((e.keyCode === 8 || e.keyCode === 37) && this.previousElementSibling && this.previousElementSibling.tagName === "INPUT") {
                    this.previousElementSibling.select();
                } else if (e.keyCode !== 8 && this.nextElementSibling) {
                    this.nextElementSibling.select();
                }
                
                if(e.target.value.length > 1 ) {
                    splitNumber(e);
                }
            });
        
            input.addEventListener('focus', function(e) {
                if ( this === in1 ) return;
                
                if ( in1.value == '' ) {
                    in1.focus();
                }
                
                if ( this.previousElementSibling.value == '' ) {
                    this.previousElementSibling.focus();
                }
            });
        });

        in1.addEventListener('input', splitNumber);
    }

    toggleType(){
        let type = $('input[name="password"]').attr("type")
        if(type === "password"){
            return $('input[name="password"]').attr('type', "username")
        }
        $('input[name="password"]').attr('type', "password")
    }

    sendMail(e){
        e.preventDefault()
        if($('#emailhider>input').prop('disabled')) {
            $('#error').addClass('hidden')
            $('#spinner').removeClass('hidden')
            $('#btn').prop('disabled', true)
            axios({
                method : "post",
                url : `${API_URL}/updatePassword`,
                data : {
                    email: $('input[name="email"]').val().trim(),
                    digit: ['otc-1', 'otc-2', 'otc-3', 'otc-4', 'otc-5', 'otc-6'].map(v => $(`#${v}`).val()).join(''),
                    password: $('input[name="password"]').val().trim()
                }
            }).then(() => {
                return this.setState({ redirect: "/login" });
            }).catch(err => {
                console.log(err)
                $('#spinner').addClass('hidden')
                $('#btn').prop('disabled', false)
                $('#error').text(err.response?.data.message).removeClass('hidden')
            })    
        } else {
            $('#error').addClass('hidden')
            $('#spinner').removeClass('hidden')
            $('#btn').prop('disabled', true)
            axios({
                method : "post",
                url : `${API_URL}/forgotPassword`,
                data : {
                    email : $('input[name="email"]').val()
                }
            }).then(() => {
                document.querySelectorAll('.tohide').forEach(e => {
                    e.classList.remove('hidden')
                })
                $('#emailhider>input').prop('disabled', true);
                $('#btn').text('Set new password')
                $('#spinner').addClass('hidden')
                $('#btn').prop('disabled', false)
            }).catch(err => {
                $('#spinner').addClass('hidden')
                $('#btn').prop('disabled', false)
                $('#error').text(err.response.data.message).removeClass('hidden')
            })            
        }   
    }

    render (){
        if(this.state.redirect){
            return <Redirect to={this.state.redirect}/>
        }
        return (
            <div className={'overflow-hidden h-full w-full justify-center items-center flex bg-gray-700'}>
                    <Link to={'/login'} className={'absolute items-center flex top-8 left-4 text-xl text-gray-200 font-semibold cursor-pointer hover:underline'}><VscArrowLeft className={'text-3xl mr-4'}/> Back to login page</Link>
                    <form className={'bg-gray-750 rounded shadow-md absolute inset-auto flex flex-col items-center p-6 z-10 forgotPass'} name={"forgotPass"}>
                        <img alt='Eating shiba' className={'absolute -left-10 -top-12'} width={'100px'} src={EatingShiba}/>
                        <h1 className={'text-white text-2xl mb-2'}>{lang.forgot}</h1>
                        <p className={'text-gray-400'}>{lang.newPW}</p>
                        <fieldset id="emailhider" className={'flex flex-col m-6 mb-2 w-full'}>
                            <label className={'uppercase text-gray-400 text-xxs font-semibold'} htmlFor='email'>{lang.accMail}</label>
                            <input placeholder={'me@example.com'} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} name="email"/>
                        </fieldset>
                        <fieldset className={'tohide digit m-6 mb-2 w-full'}>
                            <legend className={'uppercase text-gray-400 text-xxs font-semibold'}>{lang["6digit"]}</legend>
                            <label htmlFor="otc-1">{lang.number} 1</label>
                            <label htmlFor="otc-2">{lang.number} 2</label>
                            <label htmlFor="otc-3">{lang.number} 3</label>
                            <label htmlFor="otc-4">{lang.number} 4</label>
                            <label htmlFor="otc-5">{lang.number} 5</label>
                            <label htmlFor="otc-6">{lang.number} 6</label>
                            <div>
                                <input type="number" pattern="[0-9]*" defaultValue inputtype="numeric" autoComplete={"forgotPass"} className={'ml-0 focus:outline-none focus:ring-2'} id="otc-1" />
                                <input type="number" pattern="[0-9]*" min={0} max={9} maxLength={1} defaultValue inputtype="numeric" className={'focus:outline-none focus:ring-2'} id="otc-2" />
                                <input type="number" pattern="[0-9]*" min={0} max={9} maxLength={1} defaultValue inputtype="numeric" className={'focus:outline-none focus:ring-2'} id="otc-3" />
                                <input type="number" pattern="[0-9]*" min={0} max={9} maxLength={1} defaultValue inputtype="numeric" className={'focus:outline-none focus:ring-2'} id="otc-4" />
                                <input type="number" pattern="[0-9]*" min={0} max={9} maxLength={1} defaultValue inputtype="numeric" className={'focus:outline-none focus:ring-2'} id="otc-5" />
                                <input type="number" pattern="[0-9]*" min={0} max={9} maxLength={1} defaultValue inputtype="numeric" className={'mr-0 focus:outline-none focus:ring-2'} id="otc-6" />
                            </div>
                        </fieldset>
                        <fieldset className={'tohide flex flex-col relative m-6 mb-2 w-full'}>
                            <label className={'uppercase text-gray-400 text-xxs font-semibold'} htmlFor='password'>{lang.password}</label>
                            <input type={'password'} className={'bg-gray-700 text-gray-200 mt-1 px-2 p-1 rounded focus:outline-none focus:ring-2 w-full'} name="password"/>
                            <FaEyeSlash onClick={this.toggleType} className={'absolute right-2 top-7 cursor-pointer text-gray-400 hover:text-gray-200'}/>
                        </fieldset>
                        <fieldset className='flex flex-col mt-6 w-full'>
                            <button id="btn" onClick={this.sendMail.bind(this)} className={'w-full flex items-center justify-center hover:bg-blue-600 bg-blue-500 rounded p-1 font-medium text-gray-200'}>
                                <VscLoading id="spinner" className={'animate-spin mr-2 hidden'}/>
                                {lang.sendMail}
                            </button>
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