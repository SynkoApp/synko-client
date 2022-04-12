module.exports = class Database {
    constructor(){
        this.db = require('quick.db')
        this.users = new this.db.table('users')
        this.groups = new this.db.table('groups')
        this.links = new this.db.table('links')
    }
}