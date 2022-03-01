let arr = ["http://localhost:4060", "https://api.synko.kunah.fr", "ws://localhost:7758", "wss://ws.synko.kunah.fr"];
let { isDev } = require('../../package.json');
let WS_URL = isDev ? arr[2] : arr[3];
let API_URL = isDev ? arr[0] : arr[1];
export {
    API_URL,
    WS_URL
};