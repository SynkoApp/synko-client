const Database = require('./Database')
const nodemailer = require('nodemailer')
const { default: validator } = require('validator');
require('dotenv').config({path : ".env"});

module.exports = class Functions {
    constructor() {
        this.onlineUsers = new Map();
        this.webSockets = new Map()
        this.db = new Database();
        this.urlparser = require('url-parse')
        this.encryptor = require('crypto-js')
        this.fileHasher = require('crypto')
        this.fs = require('fs');
        this.validator = validator
        this.env = process.env
        this.mailer = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            auth: {
                user: process.env.SYNKO_EMAIL,
                pass: process.env.SYNKO_PASSWORD
            }
        });
    }

    fBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return {
            size: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
            unit: sizes[i],
        }
    }
    
    tokenToID(tkn){
        if(!tkn) return null
        let token = this.decrypt(tkn).split('.')
        let id = null;
        this.db.users.all().forEach(user => {
            let data = this.db.users.get(`${user.ID}`)
            if(data.username == token[0] && this.decrypt(data.password) == token[1]) id = user.ID
        })
        return id
    }

    decrypt(str){
        return this.encryptor.AES.decrypt(str, process.env.KEY).toString(this.encryptor.enc.Utf8)
    }

    getAllValidesUrls(string) {
        let regexp = /((https?):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))/g;
        let founds = string.match(regexp);
        let urls = [];
        if(!founds) return [];
        founds.forEach(url => {
            if(urls.length >= 5) return;
            let urlParsed = this.urlparser(url, true);
            let link = this.getLink(urlParsed.hostname);
            if(link) {
                urls.push(url);
            }
        });
        return urls;
    }

    checkEmailAvailability(str){
        let arr = []
        this.db.users.all().forEach(user => {
            let data = this.db.users.get(`${user.ID}`)
            arr.push(data.email)
        })
        return !arr.includes(str)
    }

    getUserFromEmail(email) {
        let userData = null;
        this.db.users.all().forEach(user => {
            let data = this.db.users.get(`${user.ID}`)
            if(data.email == email){
                userData = data;
                userData.id = user.ID;
            }
        });
        return userData;
    }

    getLink(link) {
        let data = null;
        if(this.db.links.has(`${this.encryptor.enc.Base64.stringify(this.encryptor.enc.Utf8.parse(link))}`)) {
            return link;
        } else {
            this.db.links.all().forEach(l => {
                if(this.db.links.get(`${l.ID}.aliases`).includes(link)) {
                    data = this.encryptor.enc.Base64.parse(l.ID).toString(this.encryptor.enc.Utf8)
                }
            });
            return data;
        }
    }

    checkUsernameAvailability(str){
        let available = true
        let userData = null;
        let uuid;
        this.db.users.all().forEach(user => {
            let data = this.db.users.get(`${user.ID}`)
            if(data.username == str){
                available = false;
                userData = data;
                uuid = user.ID
            }
        })
        return { available , userData, uuid }
    }

    forgotPassword(user) {
        return new Promise(async (resolve, reject) => {
            let digit = Math.floor(100000 + Math.random() * 900000);
            await this.mailer.sendMail({
                from: '"Synko App" <synko.contact@gmail.com>',
                to: `${user.email}`,
                subject: "Password change requested | Synko App",
                text: `Your 6-digit is : ${digit}\nIf it's not you requested password changing, ignore this email.`,
                html: `Your 6-digit is : ${digit}<br>If it's not you requested password changing, ignore this email.`
            });
            resolve(digit);
        })
    }

    getStatus(uid) {
        let uuid = null;
        this.onlineUsers.forEach(u => {
            if(u.uid == uid) return uuid = true;
        })
        return uuid ? 'online' : 'offline';
    }

    hashFile(file, algorithm = 'sha512', encoding = 'base64', options) {
        return new Promise((resolve, reject) => {
            const hash = this.fileHasher.createHash(algorithm);
            hash.on('error', reject).setEncoding(encoding);
            this.fs.createReadStream(file, Object.assign({}, options, {
                highWaterMark: 1024 * 1024,
            })).on('error', reject).on('end', () => {
                hash.end();
                resolve(hash.read());
            }).pipe(hash, {
                end: false,
            });
        });
    }

    isAdmin(id){
        if(this.db.users.get(`${id}.permissions`) != "1") return false
        else return true
    }

    isDigit(digit){
        return/\d{6}/.test(digit);
    }

}