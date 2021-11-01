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

export function retrieveImageFromDataToBase64(item){
    return new Promise((resolve,) => {
        let reader = new FileReader();
        reader.readAsDataURL(item);
        reader.onloadend = () => {
            resolve(reader.result);
        }
    });

}