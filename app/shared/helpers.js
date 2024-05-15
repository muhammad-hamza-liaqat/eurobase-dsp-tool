const { buildErrObject } = require('../middleware/utils')
var mongoose = require('mongoose')
const querystring = require('querystring')
const User = require('../models/user')
const notifications= require("../models/notification")
module.exports = {
  /**
   * in case need to get id without requireAuth
   * @param {String} token - binary file with path
   */
 
  async getUserIdFromToken(token) {
    return new Promise((resolve, reject) => {
      const jwt = require('jsonwebtoken')
      const auth = require('../middleware/auth')
      jwt.verify(
        auth.decrypt(token),
        process.env.JWT_SECRET,
        (err, decoded) => {
          if (err) {
            reject(buildErrObject(401, 'Unauthorized'))
          }
          resolve(decoded.data)
        }
      )
    })
  },

  /**
   * upload file to server
   * @param {Object} object - binary file with path
   */

  async uploadFile(object) {
    return new Promise((resolve, reject) => {
      var obj = object.file
      var name = Date.now() + obj.name
      obj.mv(object.path + '/' + name, function (err) {
        if (err) {
          reject(buildErrObject(422, err.message))
        }
        resolve(name)
      })
    })
  },
  

  /**
   * capitalize first letter of string
   * @param {string} string
   */

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  },

  /**
   * generate random string
   * @param {string} string
   */

  async customRandomString(
    length,
    chars = 'abcdefghijklmnopqrstuvwxyz@1234567890!'
  ) {
    var result = ''
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)]
    return result
  },

  /**
   * generate random string
   * @param {string} string
   */

  automatedString() {
    return Math.random().toString(36).slice(2)
  },

  /**
   * convert a given array of string to mongoose ids
   * @param {Array} array
   */

  async convertToObjectIds(array) {
    return array.map((item) => mongoose.Types.ObjectId(item))
  },

  /**
   * convert title to slug
   * @param {String} title
   */
  async createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-')
  },

  /**
   * Validate the size
   * @param {File} file
   * @param {Number} fize size in Byte
   */
  async validateFileSize(file, size) {
    return new Promise(async (resolve, reject) => {
      try {
        if (file.size > size) {
          reject(
            buildErrObject(422, `File should be less than ${size / 1048576} MB`)
          ) // convert byte to MB
        }
        resolve({
          success: true
        })
      } catch (err) {
        reject(buildErrObject(422, err.message))
      }
    })
  },

  /**
   * Object to Query string
   * @param {Object} obj
   */
  async objectToQueryString(obj) {
    let result = querystring.stringify(obj)

    return result
  },
  async generatePassword(length) {
    const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz'
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/'
    const numbers = '0123456789'

    const allCharacters =
      uppercaseLetters + lowercaseLetters + symbols + numbers

    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allCharacters.length)
      password += allCharacters[randomIndex]
    }

    return password
  },
  getDataByYear() {
    const months = [
      'January',
      'Febraury',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    const data = new Array(months.length).fill(0)
    const result = {
      months: months,
      data: data
    }
    return result
  }
}
