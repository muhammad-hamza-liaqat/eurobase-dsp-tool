const crypto = require('crypto')
const secret = process.env.JWT_SECRET
const algorithm = 'aes-256-cbc'
// Key length is dependent on the algorithm. In this case for aes256, it is
// 32 bytes (256 bits).
const key = crypto.scryptSync(secret, 'salt', 32)
const iv = Buffer.alloc(16, 0) // Initialization crypto vector
var bcrypt = require('bcrypt');
const utils = require('../middleware/utils')

module.exports = {
  /**
   * Checks is password matches
   * @param {string} password - password
   * @param {Object} user - user object
   * @returns {boolean}
   */
  // async checkPassword(password, userPassword) {
  //   return new Promise((resolve, reject) => {
  //     if (bcrypt.compareSync(password, userPassword)) { //if matched successfully
  //       resolve(true)
  //     } else {
  //       resolve(false)
  //     }
  //   })
  // },

  // async checkPassword(password, user) {
  //   console.log('user----->',);
  //   return new Promise((resolve, reject) => {
  //     user.comparePassword(password, (err, isMatch) => {
  //       if (err) {
  //         console.log('err------->',err);
  //         reject(utils.buildErrObject(422, err.message))
  //       }
  //       if (!isMatch) {
  //         resolve(false)
  //       }
  //       resolve(true)
  //     })
  //   })
  // },

  async checkPassword(password, user) {
    return new Promise((resolve, reject) => {
      if(!password){
        password="";
      }
      user.comparePassword(password, (err, isMatch) => {
        if (err) {
          reject(utils.buildErrObject(422, err.message))
        }
        
        if (!isMatch) {
          resolve(false)
        }
        resolve(true)
      })
    })
  },

  /**
   * Encrypts text
   * @param {string} text - text to encrypt
  */
  encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  },

  /**
   * Decrypts text
   * @param {string} text - text to decrypt
  */
  decrypt(text) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    try {
      let decrypted = decipher.update(text, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (err) {
      return err
    }
  }
}
