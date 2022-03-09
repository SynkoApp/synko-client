export async function checkToken(token, username) {
    let {API_URL} = require('./APIBase')
    let axios = require('axios')
    if(token && username){
      try{
        let res = axios({
            method: 'post',
            url: `${API_URL}/checkToken`,
            data: {
              token: token,
              username: username
            }
          })
          return await res
      } catch (err) {
        return await err
      }
    } else return false
}

export async function checkUpdate() {
    let { version } = require('../../package.json');
    let {API_URL} = require('./APIBase')
    let axios = require('axios');
    try {
        let res = await axios({
          method: 'get',
          url: `${API_URL}/latest`
        });
        let { data, status } = res;
        if(status == 200) {
          if(data?.version > version) {
            return data;
          } else {
            return false;
          }
        } else {
          return false;
        }
        //return await res;
    } catch (err) {
      return await err;
    }
}

export function retrieveImageFromDataToBase64(item){
    return new Promise((resolve,) => {
        let reader = new FileReader();
        reader.readAsDataURL(item);
        reader.onloadend = () => {
            resolve(reader.result);
        }
    });

}