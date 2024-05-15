const axios = require('axios').default;
const { buildErrObject } = require('../middleware/utils')

exports.GET = (url, body, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios({
        method: 'get',
        url: url,
        headers: headers
      })
      // console.log(resp)
      resolve(resp.data)
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error && err.response.data.error.length) {
        reject(buildErrObject(422, err.response.data.error[0]))
      }else if(err.response && err.response.data && err.response.data.ErrorCodes){
        // console.log()
        reject(buildErrObject(422, err.response.data.ErrorCodes[0].Code))
      }  else {
        reject(buildErrObject(422, err.message))
      }
    }
  })
}

exports.POST = (url, body, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios({
        method: 'post',
        url: url,
        data: body,
        headers: headers
      })
      resolve(resp.data)
    } catch (err) {
      console.log(err)
      if (err.response && err.response.data && err.response.data.error && err.response.data.error.length) {
        reject(buildErrObject(422, err.response.data.error[0]))
      } else if(err.response && err.response.data && err.response.data.ErrorCodes){
        // console.log()
        reject(buildErrObject(422, err.response.data.ErrorCodes[0].Code))
      } else {
        reject(buildErrObject(422, err.message))
      }
    }
  })
}