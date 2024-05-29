const jwt = require('jsonwebtoken')
const User = require('../models/user')
const ForgotPassword = require('../models/forgotPassword')
const UserAccess = require('../models/userAccess')
const Emails = require('../models/emails')
const Admin = require('../models/admin')
const utils = require('../middleware/utils')
const uuid = require('uuid')
const { addHours } = require('date-fns')
const { matchedData } = require('express-validator')
const auth = require('../middleware/auth')
const SubscriptionModel = require('../models/subscription')
const emailer = require('../middleware/emailer')
const HOURS_TO_BLOCK = 2
const LOGIN_ATTEMPTS = 5
const OTP_EXPIRED_TIME = 5
const { updateItem, createItem } = require('../shared/core')
const { Country, State, City } = require('country-state-city')
var mongoose = require('mongoose')
const { getItemCustom, getItemThroughId } = require('../shared/core')
const { capitalizeFirstLetter } = require('../shared/helpers')
// const { _sendNotification } = require("../controllers/admin");
const ContactUs = require('../models/contact_us')
const { sendAdminPushNotification } = require('../../config/firebase')
// Models

const notifications = require('../models/notification')
const admin = require('../models/admin')
const sub_user = require('../models/sub_user')

/*********************
 * Private functions *
 *********************/

/**
 * Generates a token
 * @param {Object} user - user object
 */

const SibApiV3Sdk = require('sib-api-v3-sdk')
const { SendSmtpEmail, SendSmtpEmailSender, SendSmtpEmailTo } = SibApiV3Sdk
const apiKey = SibApiV3Sdk.ApiClient.instance.authentications['api-key']
apiKey.apiKey = process.env.BREVO_API_KEY
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

exports._sendNotification = async (data) => {
  if (data.type) {
    await Admin.findOne({
      _id: data?.receiver_id
    })
      .then(
        async (senderDetail) => {
          if (senderDetail) {
            let title
            let notificationObj = {
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              type: data.type,
              notification_type: data.notification_type,
              description: data.description,
              typeId: data.typeId
            }
            if (data.type == 'bookings') {
              description = data.description
              title = data.title
            } else if (data.type === 'create_account') {
              notificationObj.title = data.title
            } else if (data.type == 'approval') {
              description = 'Booking Genrated'
              title = 'Booking Generated'
            } else if (data.type == 'disapproved') {
              title = 'Booking Cancel'
              description = `Booking Cancelled!`
            } else if (data.type == 'create_booking') {
              title = 'Booking Cancel'
              description = `Booking Cancelled!`
            } else if (data.type == 'create_service') {
              title = 'Service Created'
              description = `Service Created!`
            } else if (data.type == 'cancelled') {
              title = 'Booking Cancel'
              description = `Booking Cancelled!`
            } else if (data.type == 'rejected') {
              title = 'Booking rejected'
              description = `Booking Rejected!`
            } else if (data.type === 'car') {
              notificationObj.title = data.title
              notificationObj.objectName = data.objectName
            } else if (data.type === 'Permission Request') {
              notificationObj.title = data.title
            } else {
              title = data.title
              description = data.description
            }
            try {
              if (data.create_admin) {
                notificationObj.is_admin = true
                notificationObj.notification_type = notificationObj.type
                await createItem(notifications, notificationObj)
              } else {
                await createItem(notifications, notificationObj)
              }
              if (data.create) {
                // * create in db
                delete data.create
              }
            } catch (err) {
              console.log('main err: ', err)
            }
            const admin = await Admin.find()
            const fcmTokens =
              admin[0]?.fcmTokens.map((item) => item.token) || []

            if (fcmTokens.length > 0) {
              console.log('push notification')
              try {
                fcmTokens.map(
                  async (item) =>
                    await sendAdminPushNotification(
                      item,
                      notificationObj.title,
                      notificationObj.description
                    )
                )
              } catch (e) {
                console.log(e, 'error')
              }
            }
          } else {
            throw buildErrObject(422, 'sender detail is null')
          }
        },
        (error) => {
          throw buildErrObject(422, error)
        }
      )
      .catch((err) => {
        console.log('err: ', err)
      })
  } else {
    throw buildErrObject(422, '--* no type *--')
  }
}
// const generateToken = (_id, role, permissions) => {
//   // Gets expiration time
//   const expiration =
//     Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES;
//   return auth.encrypt(
//     jwt.sign(
//       {
//         data: {
//           _id,
//           role,
//           type: "user",
//           permissions,
//         },
//         exp: expiration,
//       },
//       process.env.JWT_SECRET
//     )
//   );
// };
const generateToken = (user) => {
  const secretKey = process.env.JWT_SECRET
  const expiresIn =
    Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES

  return jwt.sign({ user }, secretKey, { expiresIn, algorithm: 'HS256' })
}
/**
 * Creates an object with user info
 * @param {Object} req - request object
 */
const setUserInfo = (req) => {
  let user = {
    id: req.id,
    first_name: req.first_name,
    last_name: req.last_name,
    email: req.email,
    role: req.role,
    company_name: req.company_name
    // role: req.role,
    //verified: req.verified
  }
  // Adds verification for testing purposes
  if (process.env.NODE_ENV !== 'production') {
    user = {
      ...user,
      verification: req.verification
    }
  }
  return user
}

/**
 * Saves a new user access and then returns token
 * @param {Object} req - request object
 * @param {Object} user - user object
 */
const saveUserAccessAndReturnToken = async (req, user, role, subuser) => {
  //console.log(user,"user")
  return new Promise((resolve, reject) => {
    const userAccess = new UserAccess({
      phone_number: user.phone_number,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req)
    })
    let newUser = {
      _id: user._id,
      role: role,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    }

    userAccess.save((err) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve({
        token: generateToken(newUser),
        user: user,
        subuser: subuser
      })
    })
  })
}

/**
 * Blocks a user by setting blockExpires to the specified date based on constant HOURS_TO_BLOCK
 * @param {Object} user - user object
 */
const blockUser = async (user) => {
  return new Promise((resolve, reject) => {
    user.blockExpires = addHours(new Date(), HOURS_TO_BLOCK)
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      if (result) {
        resolve(utils.buildErrObject(409, 'BLOCKED_USER'))
      }
    })
  })
}

/**
 * Saves login attempts to dabatabse
 * @param {Object} user - user object
 */
const saveLoginAttemptsToDB = async (user) => {
  return new Promise((resolve, reject) => {
    user
      .save()
      .then((flag) => {
        resolve(true)
      })
      .catch((err) => {
        reject(utils.buildErrObject(422, err.message))
      })
  })
}

/**
 * Checks that login attempts are greater than specified in constant and also that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = (user) =>
  user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date()

/**
 *
 * @param {Object} user - user object.
 */
const checkLoginAttemptsAndBlockExpires = async (user) => {
  return new Promise((resolve, reject) => {
    // Let user try to login again after blockexpires, resets user loginAttempts
    if (blockIsExpired(user)) {
      user.loginAttempts = 0
      user
        .save()
        .then((data) => {
          resolve(true)
        })
        .catch((err) => {
          reject(utils.buildErrObject(422, err.message))
        })
    } else {
      // User is not blocked, check password (normal behaviour)
      resolve(true)
    }
  })
}

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsBlocked = async (user) => {
  return new Promise((resolve, reject) => {
    if (user.blockExpires > new Date()) {
      reject(utils.buildErrObject(409, 'BLOCKED_USER'))
    }
    resolve(true)
  })
}

/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findUser = async (email) => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      'password loginAttempts blockExpires first_name last_name email verification_status',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'email not found')
        resolve(item)
      }
    )
  })
}

const findUserAdmin = async (email) => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email
      },
      'password loginAttempts blockExpires first_name last_name',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'email not found')
        resolve(item)
      }
    )
  })
}

/**
 * Finds user with query
 * @param {string} email - user´s email
 */
const findUserWithQuery = async (query) => {
  return new Promise((resolve, reject) => {
    User.findOne(
      query,
      'password loginAttempts blockExpires social_id login_type first_name last_name username email role verified verification profile_percentage',
      (err, item) => {
        // utils.itemNotFound(err, item, reject, 'EMAIL NOT FOUND')
        resolve(item)
      }
    )
  })
}

/**
 * Finds user by ID
 * @param {string} id - user´s id
 */
const findUserById = async (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId, (err, item) => {
      utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
      resolve(item)
    })
  })
}

/**
 * Adds one attempt to loginAttempts, then compares loginAttempts with the constant LOGIN_ATTEMPTS, if is less returns wrong password, else returns blockUser function
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async (user) => {
  user.loginAttempts += 1
  await saveLoginAttemptsToDB(user)
  return new Promise((resolve, reject) => {
    if (user.loginAttempts <= LOGIN_ATTEMPTS) {
      resolve(utils.buildErrObject(409, 'WRONG PASSWORD'))
    } else {
      resolve(blockUser(user))
    }
    reject(utils.buildErrObject(422, 'ERROR'))
  })
}

/**
 * Registers a new user in database
 * @param {Object} req - request object
 */
const registerUser = async (data) => {
  return new Promise((resolve, reject) => {
    data.verification = uuid.v4()
    const user = new User(data)
    console.log('user', user)
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

/**
 * Builds the registration token
 * @param {Object} item - user object that contains created id
 * @param {Object} userInfo - user object
 */
const returnRegisterToken = (item, userInfo) => {
  if (process.env.NODE_ENV !== 'production') {
    userInfo.verification = item.verification
  }
  let user = {
    _id: item._id,
    email: item.email,
    first_name: item.first_name,
    last_name: item.last_name,
    role: 'user',
    company_name: "item.company_name" 
  }
  const data = {
    token: generateToken(user),
    user: userInfo
  }
  return data
}

/**
 * Checks if verification id exists for user
 * @param {string} id - verification id
 */

const verificationExists = async (id) => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        verification: id,
        verified: false
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND_OR_ALREADY_VERIFIED')
        resolve(user)
      }
    )
  })
}

/**
 * Verifies an user
 * @param {Object} user - user object
 */
const verifyUser = async (user) => {
  return new Promise((resolve, reject) => {
    user.verified = true
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve({
        email: item.email,
        verified: item.verified
      })
    })
  })
}

/**
 * Marks a request to reset password as used
 * @param {Object} req - request object
 * @param {Object} forgot - forgot object
 */
const markResetPasswordAsUsed = async (req, forgot) => {
  return new Promise((resolve, reject) => {
    forgot.used = true
    forgot.ipChanged = utils.getIP(req)
    forgot.browserChanged = utils.getBrowserInfo(req)
    forgot.countryChanged = utils.getCountry(req)
    forgot.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(utils.buildSuccObject('PASSWORD_CHANGED'))
    })
  })
}

/**
 * Updates a user password in database
 * @param {string} password - new password
 * @param {Object} user - user object
 */
const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password
    user.decoded_password = password
    user.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(item)
    })
  })
}

/**
 * Finds user by email to reset password
 * @param {string} email - user email
 */
const findUserToResetPassword = async (email) => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

/**
 * Checks if a forgot password verification exists
 * @param {string} id - verification id
 */
const findForgotPassword = async (id) => {
  return new Promise((resolve, reject) => {
    ForgotPassword.findOne(
      {
        verification: id,
        used: false
      },
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'LINK HAS EXPIRED')
        resolve(item)
      }
    )
  })
}

/**
 * Creates a new password forgot
 * @param {Object} req - request object
 */
const saveForgotPassword = async (req) => {
  return new Promise((resolve, reject) => {
    const forgot = new ForgotPassword({
      email: req.body.email,
      verification: uuid.v4(),
      ipRequest: utils.getIP(req),
      browserRequest: utils.getBrowserInfo(req),
      countryRequest: utils.getCountry(req)
    })
    forgot.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

/**
 * Builds an object with created forgot password object, if env is development or testing exposes the verification
 * @param {Object} item - created forgot password object
 */
const forgotPasswordResponse = (item) => {
  let data = {
    msg: 'RESET_EMAIL_SENT',
    email: item.email
  }
  if (process.env.NODE_ENV !== 'production') {
    data = {
      ...data,
      verification: item.verification
    }
  }
  return data
}

/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissions = async (data, next) => {
  return new Promise((resolve, reject) => {
    User.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}

/**
 * Gets user id from token
 * @param {string} token - Encrypted and encoded token
 */
const getUserIdFromToken = async (token) => {
  return new Promise((resolve, reject) => {
    // Decrypts, verifies and decode token
    jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(utils.buildErrObject(409, 'BAD_TOKEN'))
      }
      resolve(decoded.data._id)
    })
  })
}

/********************
 * Public functions *
 ********************/

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
// exports.login = async (req, res) => {
//   try {
//     const data = req.body;
//     data.user_ip_address = req.socket.remoteAddress
//     console.log("****DATA*****", data);

//     const user = await findUser(data.email)

//     const IS_IP_ADDRESS_EXIST = await User.findOne({ _id: user._id, user_ip_address: { $nin: [data.user_ip_address] } })

//     if (data.allowed_type && data.allowed_type != user.role) {
//       return res.status(422).json({
//         code: 422,
//         success: false,
//         errors: {
//           msg: `Please continue with a ${data.allowed_type} account`
//         }
//       })
//     }

//     await userIsBlocked(user)

//     await checkLoginAttemptsAndBlockExpires(user)

//     const isPasswordMatch = await auth.checkPassword(data.password, user)

//     if (!isPasswordMatch) {
//       utils.handleError(res, await passwordsDoNotMatch(user))
//       return
//     }

//     user.loginAttempts = 0

//     await saveLoginAttemptsToDB(user)

//     if (!user.verified) {
//       return res.status(422).json({
//         code: 422,
//         errors: {
//           msg: "Please verify your email to login"
//         }
//       })
//     }

//     let userObj = JSON.parse(JSON.stringify(user))
//     console.log("userObj**********", userObj);
//     delete userObj.password
//     if (userObj.security_question) {
//       delete userObj.security_question.answer
//     }

//     if (userObj.two_step_verification.confirm_config === 'first') {
//       if (userObj.is_two_step_verifications_on === false && IS_IP_ADDRESS_EXIST) {
//         const token = await saveUserAccessAndReturnToken(req, userObj)
//         return res.status(200).json(token)
//       } else if (userObj.is_two_step_verifications_on === true) {

//         if (IS_IP_ADDRESS_EXIST) {
//           console.log("Inside IF IS_IP_ADDRESS_EXIST case first");
//           const token = await saveUserAccessAndReturnToken(req, userObj)
//           return res.status(200).json(token)

//         } else {

//           const User_Object = {
//             email: userObj.email,
//             username: userObj.username,
//             two_step_verification: userObj.two_step_verification,
//             security_question: userObj.security_question,
//             is_two_step_verifications_on: userObj.is_two_step_verifications_on,
//             first_name: userObj.first_name,
//             last_name: userObj.last_name,
//             _id: userObj._id
//           }
//           const temporary_token = await saveUserAccessAndReturnToken(req, User_Object)
//           return res.status(200).json(temporary_token)

//         }
//       }

//     } else if (userObj.two_step_verification.confirm_config === 'second') {
//       await User.update(
//         {
//           _id: userObj._id,
//         },
//         {
//           is_two_step_verifications_on: true
//         }
//       );

//       userObj.is_two_step_verifications_on = true;

//       if (userObj.is_two_step_verifications_on === false) {
//         const token = await saveUserAccessAndReturnToken(req, userObj)
//         return res.status(200).json(token)
//       } else if (userObj.is_two_step_verifications_on === true) {
//         if (IS_IP_ADDRESS_EXIST) {
//           const token = await saveUserAccessAndReturnToken(req, userObj)
//           return res.status(200).json(token)

//         } else {

//           const User_Object = {
//             email: userObj.email,
//             username: userObj.username,
//             two_step_verification: userObj.two_step_verification,
//             is_two_step_verifications_on: userObj.is_two_step_verifications_on,
//             security_question: userObj.security_question,
//             first_name: userObj.first_name,
//             last_name: userObj.last_name,
//             _id: userObj._id
//           }

//           const temporary_token = await saveUserAccessAndReturnToken(req, User_Object)
//           return res.status(200).json(temporary_token)
//         }

//       }

//     }

//     // if(userObj.is_two_step_verifications_on === false){
//     //   // console.log("INSIDE IF is_two_step_verifications_on === false");
//     //   if(IS_IP_ADDRESS_EXIST){
//     //     const token = await saveUserAccessAndReturnToken(req, userObj)
//     //     return res.status(200).json(token)
//     //   }
//     // }else if(userObj.is_two_step_verifications_on === true){

//     //   if(userObj.two_step_verification.confirm_config === 'first'){

//     //     if(IS_IP_ADDRESS_EXIST) {
//     //       console.log("Inside IF IS_IP_ADDRESS_EXIST case first");
//     //       const token = await saveUserAccessAndReturnToken(req, userObj)
//     //       return res.status(200).json(token)

//     //     }else{

//     //       const User_Object = {
//     //         email : userObj.email,
//     //         username: userObj.username,
//     //         two_step_verification: userObj.two_step_verification,
//     //         security_question: userObj.security_question,
//     //         is_two_step_verifications_on: userObj.is_two_step_verifications_on,
//     //         first_name: userObj.first_name,
//     //         last_name: userObj.last_name,
//     //         _id: userObj._id
//     //       }
//     //       const temporary_token = await saveUserAccessAndReturnToken(req, User_Object)

//     //       // console.log("Inside Else IS_IP_ADDRESS_EXIST case first");

//     //       return res.status(200).json(temporary_token)

//     //     }

//     //   }else if(userObj.two_step_verification.confirm_config === 'second'){

//     //     if(IS_IP_ADDRESS_EXIST){

//     //       // console.log("Inside if IS_IP_ADDRESS_EXIST  Case Second");

//     //       const token = await saveUserAccessAndReturnToken(req, userObj)
//     //       return res.status(200).json(token)

//     //     }else{

//     //       const User_Object = {
//     //         email : userObj.email,
//     //         username: userObj.username,
//     //         two_step_verification: userObj.two_step_verification,
//     //         is_two_step_verifications_on: userObj.is_two_step_verifications_on,
//     //         security_question: userObj.security_question,
//     //         first_name: userObj.first_name,
//     //         last_name: userObj.last_name,
//     //         _id: userObj._id
//     //       }

//     //       // console.log("Inside else IS_IP_ADDRESS_EXIST  Case Second");

//     //       const temporary_token = await saveUserAccessAndReturnToken(req, User_Object)
//     //       return res.status(200).json(temporary_token)
//     //     }

//     //   }

//     // }

//     return res.status(200).json(await saveUserAccessAndReturnToken(req, userObj))

//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }
const saveLastLoginTimeAndAttemptsToDB = async (user) => {
  return new Promise((resolve, reject) => {
    user
      .save()
      .then((flag) => {
        resolve(true)
      })
      .catch((err) => {
        reject(utils.buildErrObject(422, err.message))
      })
  })
}

exports.login = async (req, res) => {
  try {
    let subuser = false
    const data = req.body
    let role
    let user
    let status
    user = await User.findOne(
      { email: data.email },
      {
        password: 1,
        verification_status: 1,
        secondary_emails: 1,
        trialPeriod: 1,
        last_login: 1,
        first_login: 1,
        role: 1,
        permissions: 1
      }
    )
    if (user) {
      status = user.verification_status === true ? true : false
    } else {
      user = await User.findOne(
        {
          'secondary_emails.email': data.email
        },
        {
          password: 1,
          verification_status: 1,
          secondary_emails: 1,
          trialPeriod: 1,
          first_login: 1,
          last_login: 1,
          permissions: 1,
          role: 1
        }
      )

      if (user) {
        const tempMail = user?.secondary_emails?.find(
          (item) => item.email === data.email
        )
        status = tempMail.verification_status === true ? true : false
      }
    }
    if (!user) {
      user = await sub_user.findOne(
        { email: data.email },
        {
          password: 1,
          permissions: 1,
          role: 1,
          user_id: 1,
          user_type: 1
        }
      )
      if (user) {
        subuser = true
        status = true
      }
    }
    if (!user) {
      return res.status(404).json({ code: 404, message: 'Email not found' })
    }
    if (status === false) {
      return res.status(403).json({ code: 403, error: 'Email not verified.' })
    }
    if (subuser) {
      let subuser = await sub_user.findById(user._id, {
        password: 1,
        is_active: 1,
        user_type: 1,
        user_id: 1
      })
      if (subuser.is_active === 'inactive') {
        return res.status(403).json({
          code: 403,
          message: 'You have no permissions to login to this website'
        })
      }
      const isPasswordMatch = await auth.checkPassword(data.password, subuser)
      if (!isPasswordMatch) {
        throw utils.buildErrObject(422, 'Password is not correct')
      }
      role = subuser.user_type
      user = await User.findById(subuser.user_id)
      if (user.status === 'inactive') {
        return res.status(403).json({
          code: 403,
          message: 'You have no permissions to login to this website'
        })
      }
      if (
        user.trialPeriod &&
        Date.now() - user.first_login.getTime() > 2 * 24 * 60 * 60 * 1000
      ) {
        user.trialPeriod = false
        await user.save()
        res
          .status(402)
          .send('Demo period has expired. Please subscribe to continue.')
      } else {
        let subuser = await sub_user.findOne({ email: data.email })
        res.status(200).json({
          code: 200,
          data: await saveUserAccessAndReturnToken(req, user, role, subuser)
        })
      }
      // subuser = await sub_user.findOne({ email: data.email })
      // res.status(200).json({
      //   code: 200,
      //   data: await saveUserAccessAndReturnToken(req, user, role, subuser)
      // })
    } else {
      user = await User.findById(user._id, { password: 1 })
      await userIsBlocked(user)
      await checkLoginAttemptsAndBlockExpires(user)
      let isPasswordMatch
      if (user.password) {
        isPasswordMatch = await auth.checkPassword(data.password, user)
      } else {
        return res.status(404).send({
          code: 404,
          message:
            'To log in with your email and password, you need to set up your password from the app.'
        })
      }

      if (!isPasswordMatch) {
        throw utils.buildErrObject(422, 'Password is not correct')
      }
      user = await User.findById(user._id)
      if (user.status === 'inactive') {
        return res.status(403).json({
          code: 403,
          message: 'Permission denied by admin'
        })
      }
      if (!user.first_login) {
        if (!user.subscription_plan) {
          const plan = await SubscriptionModel.find()
          const demoPlan = plan.find((item) => item.price === 0)
          if (demoPlan) {
            user.subscription_plan = demoPlan._id
            user.planActivationDate = new Date()
            var currentDate = new Date()
            var futureDate = new Date(currentDate)
            futureDate.setDate(currentDate.getDate() + 30)
            user.planValidity = futureDate
            user.trialPeriod = true
          }
        }
        user.first_login = new Date()
        await user.save()
      }

      user.last_login = new Date()
      await user.save()

      const subuser = null,
        role = 'user'
      res.status(200).json({
        code: 200,
        data: await saveUserAccessAndReturnToken(req, user, role, subuser)
      })
    }
  } catch (error) {
    console.log(error.message)
    utils.handleError(res, error)
  }
}

exports.twoStepVerification = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    data.user_ip_address = req.socket.remoteAddress

    const Obj = {
      _id: data.user_id,
      'security_question.answer': data.answer
    }
    const is_answer_correct = await User.findOne(
      Obj,
      'password loginAttempts blockExpires first_name last_name username email role verified verification two_step_verification security_question _id profile_percentage profile_completed is_two_step_verifications_on'
    )

    if (is_answer_correct) {
      // const userObj = await findUser(data.user_id)
      delete is_answer_correct.password
      delete is_answer_correct.security_question.answer

      await User.updateMany(
        {
          _id: data.user_id,
          user_ip_address: { $nin: [data.user_ip_address] }
        },
        {
          $push: { user_ip_address: data.user_ip_address }
        }
      )
      const Update_STATUS = await User.update(
        {
          _id: data.user_id
        },
        {
          is_two_step_verifications_on: false
        }
      )

      if (Update_STATUS) {
        is_answer_correct.is_two_step_verifications_on = false
      }

      const token = await saveUserAccessAndReturnToken(req, is_answer_correct)

      return res.status(200).json(token)
    } else {
      return res.json({
        code: 422,
        message: 'Answer is incorrect !'
      })
    }
  } catch (err) {
    utils.handleError(res, err)
  }
}

/**
 * Social Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
/* exports.socialLogin = async (req, res) => {
  try {
    const data = req.body;


    // First of all check the if social id is exist
    var user = await findUserWithQuery({
      social_id: data.social_id,
      login_type: data.login_type
    });

    if (user) {
      user.loginAttempts = 0;
      if (user.role === 'Professional') {
        if (user.profile_percentage == 100) {
          await User.updateMany(
            { _id: user._id },
            { profile_completed: true }
          );
          user.profile_completed = true;

        } else {
          await User.updateMany(
            { _id: user._id },
            { profile_completed: false }
          );
          user.profile_completed = false;
        }

      }


      await saveLoginAttemptsToDB(user);
      let userObj = JSON.parse(JSON.stringify(user))
      delete userObj.password
      console.log("user", user);

      return res.status(200).json(await saveUserAccessAndReturnToken(req, userObj))
    } else {

      console.log("else");

      // first check email
      var isExist = await findUserWithQuery({
        email: data.email
      });

      if (!isExist) {
        const item = await registerUser({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          social_id: data.social_id,
          login_type: data.login_type,
          username: data.social_id,
          role: data.role,
        })

        console.log("data", data);

        const response = returnRegisterToken(item, item)
        res.status(201).json(response,)
      } else {
        console.log("isExist", isExist);

        if (isExist.role === 'Professional') {
          if (isExist.profile_percentage == 100) {
            await User.updateMany(
              { _id: isExist._id },
              { profile_completed: true }
            );
            isExist.profile_completed = true;

          } else {
            await User.updateMany(
              { _id: isExist._id },
              { profile_completed: false }
            );
            isExist.profile_completed = false;
          }
        }
        isExist.social_id = data.social_id;
        isExist.login_type = data.login_type;
        await isExist.save();
        isExist.loginAttempts = 0;
        await saveLoginAttemptsToDB(isExist);
        let userObj = JSON.parse(JSON.stringify(isExist))
        delete userObj.password
        return res.status(200).json(await saveUserAccessAndReturnToken(req, userObj))
      }

    }





  } catch (error) {
    utils.handleError(res, error)
  }
} */

exports.verifyEmail = async (req, res) => {
  let item = await updateItem(
    User,
    { _id: req.params.id },
    {
      verification_status: true
    }
  )
  res.redirect(`https://dev-eurobosse.web.app/login`)
  res.end()
}

exports.verifyEmailforapp = async (req, res) => {
  let item = await updateItem(
    User,
    { _id: req.params.id },
    {
      verification_status: true
    }
  )
  // res.redirect(`https://dev-eurobosse.web.app/signin`);
  // res.end();
  res.status(200).json({ msg: 'verified' })
}

/**
 * check username availablity
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

exports.checkUsernameAvailability = async (req, res) => {
  try {
    const doesUsernameExists = await emailer.usernameExists(req.body.username)
    res.status(201).json(doesUsernameExists)
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.test = async (req, res) => {
  try {
    const data = 'THIS IS FOR TESTING ONLY'
    res.status(200).json({
      code: 200,
      data
    })
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * check email availablity
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

exports.checkEmailAvailability = async (req, res) => {
  try {
    const doesEmailExists = await emailer.emailExists(req.body.email)
    res.status(201).json(doesEmailExists)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Register function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

// exports.register = async (req, res) => {
//   try {
//     const locale = req.getLocale(); // Gets locale from header 'Accept-Language'
//     let data = req.body;
//     console.log("data ", req.body);
//     // const doesEmailExists = await emailer.emailExists(data.email)
//     const doesEmailExists = await User.findOne({ email: data.email });

//     if (!doesEmailExists) {
//       if (data.type == "phone") {
//         data.decoded_password = data.password;
//         const item = await registerUser(data);
//         const userInfo = setUserInfo(item);
//         const response = returnRegisterToken(item, userInfo);

//         await createItem(Emails, {
//           user_id: response.user.id,
//           email: response.user.email,
//         });
//         emailer.sendVerificationEmailforapp(locale, item, "verifyEmail");
//         res.status(201).json(response);
//       } else {
//         data.role = "superuser";
//         data.permissions = [
//           "Access_Calendar",
//           "Access_Dashboard",
//           "Access_Quote",
//           "Access_Free_Quote",
//           "Access_Service",
//           "Access_Profile",
//           "Access_Invoice",
//           "Access_Client",
//           "Access_Top_Clients",
//           "Access_Notifications",
//           "Access_User_Authorization",
//           "Access_MyData",
//           "Access_Car_List",
//         ];
//         const item = await registerUser(data);
//         const userInfo = setUserInfo(item);
//         const response = returnRegisterToken(item, userInfo);
//         await createItem(Emails, {
//           user_id: response.user.id,
//           email: response.user.email,
//         });
//         let admin = await Admin.find();
//         let notificationObj = {
//           sender_id: response.user._id,
//           receiver_id: admin[0]._id,
//           type: "create_account",
//           title: "Account created",
//           create_admin: true,
//           typeId: response.user._id,
//           description:
//             response.user.first_name +
//             " " +
//             response.user.last_name +
//             " " +
//             "has been successfully registered",
//         };
//         await this._sendNotification(notificationObj);
//         await emailer.sendVerificationEmail(locale, item, "verifyEmail");
//         res.status(201).json(response);
//       }
//     } else {
//       return res.json({ code: 422, msg: "Email already exist" });
//       // utils.buildErrObject(422, 'Email already exist')
//     }
//   } catch (error) {
//     console.log(error.message);
//     utils.handleError(res, error);
//   }
// };


// new code with brevo email
const ejs = require("ejs");
const path = require("path");


exports.register = async (req, res) => {
  try {
    const locale = req.getLocale(); 
    let data = req.body;
    console.log("data ", req.body);

    const doesEmailExists = await User.findOne({ email: data.email });

    if (!doesEmailExists) {
      if (data.type === "phone") {
        console.log("data.type==phone exceution")
        data.decoded_password = data.password;
        const item = await registerUser(data);
        const userInfo = setUserInfo(item);
        const response = returnRegisterToken(item, userInfo);

        await createItem(Emails, {
          user_id: response.user.id,
          email: response.user.email,
        });

        const templateData = {
          name: `${response.user.first_name} ${response.user.last_name}`,
          company_name: `${response.user.company_name}` || "my_company",
          company_email: response.user.email,
          verification_link: process.env.VERIFICATION_LINK,
          appName: process.env.APP_NAME
        };

        let customHtmlTemplate = await ejs.renderFile(path.join(__dirname, "../../views/en/verifyEmail.ejs"), templateData);

        const emailData = {
          to: [{ email: response.user.email, name: `${response.user.first_name} ${response.user.last_name}` }],
          sender: { email: process.env.BREVO_EMAIL, name: process.env.BREVO_USER_NAME },
          subject: "Verification of the Newly Created Account!",
          htmlContent: customHtmlTemplate
        };
        await apiInstance.sendTransacEmail(emailData);

        return res.status(201).json(response);
      } else {
        console.log("superuser code exceution ----------------->")
        data.role = "superuser";
        data.permissions = [
          "Access_Calendar",
          "Access_Dashboard",
          "Access_Quote",
          "Access_Free_Quote",
          "Access_Service",
          "Access_Profile",
          "Access_Invoice",
          "Access_Client",
          "Access_Top_Clients",
          "Access_Notifications",
          "Access_User_Authorization",
          "Access_MyData",
          "Access_Car_List",
        ];
        const item = await registerUser(data);
        const userInfo = setUserInfo(item);
        const response = returnRegisterToken(item, userInfo);
        await createItem(Emails, {
          user_id: response.user.id,
          email: response.user.email,
        });
        let admin = await Admin.find();
        let notificationObj = {
          sender_id: response.user._id,
          receiver_id: admin[0]._id,
          type: "create_account",
          title: "Account created",
          create_admin: true,
          typeId: response.user._id,
          description: `${response.user.first_name} ${response.user.last_name} has been successfully registered`,
        };
        await this._sendNotification(notificationObj);

        const templateData = {
          name: `${response.user.first_name} ${response.user.last_name}`,
          company_name: `${response.user.company_name}` || "my_company",
          company_email: response.user.email,
          verification_link: process.env.VERIFICATION_LINK,
          appName: process.env.APP_NAME
        };

        let customHtmlTemplate = await ejs.renderFile(path.join(__dirname, "../../views/en/verifyEmail.ejs"), templateData);

        const emailData = {
          to: [{ email: response.user.email, name: `${response.user.first_name} ${response.user.last_name}` }],
          sender: { email: process.env.BREVO_EMAIL, name: process.env.BREVO_USER_NAME },
          subject: "Verification of the Newly Created Account!",
          htmlContent: customHtmlTemplate
        };
        await apiInstance.sendTransacEmail(emailData);

        return res.status(201).json(response);
      }
    } else {
      console.log("email already exist-bad request!")
      return res.status(400).json({ code: 400, msg: "Email already exist" });
    }
  } catch (error) {
    console.log("catch block exceution ------------------->")
    console.log(error.message);
    return res.status(500).json({ code: 500, message: "Internal Server Error", details: error });
  }
};

/**
 * Verify function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.verify = async (req, res) => {
  try {
    req = matchedData(req)
    const user = await verificationExists(req.id)
    res.status(200).json(await verifyUser(user))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

// exports.sendForgotPasswordEmail = async (req, res) => {
//   try {
//     const locale = req.getLocale(); // Gets locale from header 'Accept-Language'
//     const data = req.body;
//     const user = await findUser(data.email);

//     let forgotPassword = await getItemCustom(ForgotPassword, {
//       email: data.email,
//     });
//     let mailOptions = {
//       to: data.email,
//       subject: "Forgot Password",
//       name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(
//         user.last_name
//       )}`,
//       url: `${process.env.SEND_FORGOT_PASSWORD_ON_EMAIL}/?id=${user._id}`,
//     };

//     const emailData = {
//       user: {
//         name: mailOptions.name,
//         email: mailOptions.to,
//       },
//       subject: mailOptions.subject,
//       htmlMessage: `<p>Hi ${mailOptions.name},</p><p>Click <a href="${mailOptions.url}">here</a> to reset your password.</p>`
//     };

//     console.log("emailData", emailData);
//     await emailer.sendEmail(emailData, (success) => {
//       if (success) {
//         return res.status(200).json(forgotPasswordResponse(forgotPassword),mailOptions.url );
//       } else {
//         console.log('Email sending failed');
//         return res.status(400).json({error: "email sending failed", url : mailOptions.url})
//       }
//     });
//   } catch (error) {
//     utils.handleError(res, error);
//   }
// };

// new code with brevo

// new code with brevo

exports.sendForgotPasswordEmail = async (req, res) => {
  try {
    const locale = req.getLocale() // Gets locale from header 'Accept-Language'
    const data = req.body
    const user = await findUser(data.email)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let forgotPassword = await getItemCustom(ForgotPassword, {
      email: data.email
    })

    const capitalizeFirstLetter = (string) =>
      string.charAt(0).toUpperCase() + string.slice(1)

    const mailOptions = {
      to: data.email,
      subject: 'Forgot Password',
      name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(
        user.last_name
      )}`,
      url: `${process.env.SEND_FORGOT_PASSWORD_ON_EMAIL}/?id=${user._id}`
    }
    console.log('brevo_email', process.env.BREVO_EMAIL)
    console.log('BREVO_USER_NAME', process.env.BREVO_USER_NAME)

    const emailData = {
      to: [{ email: mailOptions.to, name: mailOptions.name }],
      sender: {
        email: process.env.BREVO_EMAIL,
        name: process.env.BREVO_USER_NAME
      },
      subject: mailOptions.subject,
      htmlContent: `<html><body>
                      <p>Hi ${mailOptions.name},</p>
                      <p>Click <a href="${mailOptions.url}">here</a> to reset your password.</p>
                    </body></html>`
    }

    console.log('emailData', emailData)

    await apiInstance.sendTransacEmail(emailData)

    return res.status(200).json({
      msg: 'RESET_EMAIL_SENT',
      email: mailOptions.to,
      verification: forgotPassword
    })
  } catch (error) {
    console.error('Error sending forgot password email:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetForgotPassword = async (req, res) => {
  try {
    const data = req.body
    console.log('data inside resetForgotPassword', data)
    // const forgotPassword = await findForgotPassword(data.verification)
    const user = await User.findById(data.id)
    if (user) {
      await updatePassword(data.password, user)
      res.status(200).json({ code: 200, status: 'password updated' })
    } else {
      utils.buildErrObject(422, 'user not existed')
    }
    // const result = await markResetPasswordAsUsed(req, forgotPassword)
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.resetForgotPasswordforapp = async (req, res) => {
  try {
    const data = req.body
    // const forgotPassword = await findForgotPassword(data.verification)
    const user = await findUser(data.email)
    if (user) {
      await updatePassword(data.password, user)
      res.status(200).json({ code: 200, status: 'password updated' })
    } else {
      utils.buildErrObject(422, 'user not existed')
    }
    // const result = await markResetPasswordAsUsed(req, forgotPassword)
  } catch (error) {
    utils.handleError(res, error)
  }
}
/**
 * Refresh token function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getRefreshToken = async (req, res) => {
  try {
    const tokenEncrypted = req.headers.authorization
      .replace('Bearer ', '')
      .trim()
    let userId = await getUserIdFromToken(tokenEncrypted)
    userId = await utils.isIDGood(userId)
    const user = await findUserById(userId)
    const token = await saveUserAccessAndReturnToken(req, user)
    // Removes user info from response
    delete token.user
    res.status(200).json(token)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Roles authorization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorization = (roles) => async (req, res, next) => {
  try {
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissions(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Change Password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.changePassword = async (req, res) => {
  try {
    const user = await User.findOne(
      { _id: req.user._id },
      { password_filled: 1, password: 1 }
    )
    console.log(user)
    if (user.password_filled) {
      if (!req.body.old_password) {
        return res.status(401).send({ message: 'old password required' })
      }
      const isPasswordMatch = await auth.checkPassword(
        req.body.old_password,
        user
      )
      if (!isPasswordMatch) {
        return res.status(400).send({
          message: 'Incorrect Password'
        })
      } else {
        console.log('already Password')
        await updatePassword(req.body.new_password, user)
        await User.findOneAndUpdate(
          { _id: req.user._id },
          { password_filled: true },
          { new: true }
        )
      }
    } else {
      console.log('no password')
      await updatePassword(req.body.new_password, user)
      await User.findOneAndUpdate(
        { _id: req.user._id },
        { password_filled: true },
        { new: true }
      )
    }
    return res.json({
      code: 200,
      message: 'Password changed successfully'
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'internal server error',
      error: error.message
    })
  }
}

//CHECKOTP
const checkOTP = async (user, otp) => {
  return new Promise((resolve, reject) => {
    if (user.otp_expire_time < new Date())
      reject(utils.buildErrObject(409, 'OTP_EXPIRED'))
    if (user.phone_OTP != otp) reject(utils.buildErrObject(409, 'INVALID_OTP'))
    resolve(true)
  })
}

//LOGIN AND REGISTER
exports.sendOtp = async (req, res) => {
  try {
    const data = req.body
    let user = await User.findOne({ phone_number: data.phone_number })
    if (!user) {
      const createUser = await createItem(User, {
        phone_number: data.phone_number
      })
      user = createUser.data
    }

    //send otp
    user.phone_OTP = Math.floor(1000 + Math.random() * 9000)
    user.otp_expire_time = new Date(
      new Date().getTime() + OTP_EXPIRED_TIME * 60 * 1000
    )

    await user.save()

    res.json(user)
  } catch (err) {
    utils.handleError(res, err)
  }
}

exports.loginWithPhone = async (req, res) => {
  try {
    const data = req.body
    let user = await User.findOne({ phone_number: data.phone_number })
    if (!user) {
      return utils.buildErrObject(409, 'Wrong User')
    }

    if (await checkOTP(user, data.otp)) {
      user.otp_expire_time = new Date()
      user.phone_OTP = 0
      await user.save()
    }

    res.json(await saveUserAccessAndReturnToken(req, user))
  } catch (err) {
    utils.handleError(res, err)
  }
}

exports.adminResetForgotPassword = async (req, res) => {
  try {
    const data = req.body
    // const forgotPassword = await findForgotPassword(data.verification)
    const user = await findUserAdmin(data.email)
    user.decoded_password = data.password
    await user.save()
    await updatePassword(data.password, user)
    // const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json({ code: 200, status: 'password updated' })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.socialLogin = async (req, res) => {
  try {
    const data = req.body
    data.password_filled = false
    console.log(data)
    const userExists = await User.findOne({ email: data.email })
    const socialIdExists = await User.findOne({
      social_id: data.social_id,
      social_type: data.social_type
    })
    if (!userExists && !socialIdExists) {
      data.verification_status = true
      const item = await registerUser(data)

      const userInfo = setUserInfo(item)

      const response = returnRegisterToken(item, userInfo)

      const subuser = null

      res.status(201).json({ code: 200, data: response })
    } else {
      if (userExists.status === 'inactive') {
        return res.status(403).json({
          code: 403,
          message: 'Permission denied by admin'
        })
      }
      if (!userExists.first_login) {
        if (!userExists.subscription_plan) {
          const plan = await SubscriptionModel.find()
          const demoPlan = plan.find((item) => item.price === 0)
          userExists.subscription_plan = demoPlan._id
          userExists.planActivationDate = new Date()
          var currentDate = new Date()
          var futureDate = new Date(currentDate)
          futureDate.setDate(currentDate.getDate() + 30)
          userExists.planValidity = futureDate
          userExists.trialPeriod = true
        }

        userExists.first_login = new Date()
        await userExists.save()
      }
      userExists.last_login = new Date()
      await userExists.save()

      const subuser = null
      res.status(200).json({
        code: 200,
        data: await saveUserAccessAndReturnToken(
          req,
          userExists,
          'user',
          subuser
        )
      })
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.GetAllCountries = async (req, res) => {
  res.send({
    code: 200,
    data: await Country.getAllCountries()
  })
}

exports.getStatesOfCountry = async (req, res) => {
  const data = req.query
  res.send({
    code: 200,
    data: await State.getStatesOfCountry(data.countryCode)
  })
}

exports.getCitiesOfState = async (req, res) => {
  const data = req.query
  res.send({
    code: 200,
    data: await City.getCitiesOfState(data.countryCode, data.stateCode)
  })
}

exports.sendUserCredentials = async (req, res) => {
  const user = await getItemThroughId(User, req.body.id)
  if (user.data) {
    await emailer.sendPasswordToSubUser(
      req.getLocale(),
      {
        to: user.data.email,
        name: `${user.data.first_name} ${user.data.last_name}`,
        password: user.data.decoded_password,
        subject: `Password`
      },
      'sendPasswordToSubUser'
    )
  }
  res.send({
    code: 200,
    response: 'Mail sent'
  })
}
exports.approveAccessByUser = async (req, res) => {
  try {
    const admin = await Admin.find()
    if (req.query.request === 'decline') {
      const notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: admin[0]._id.toString(),
        notification_type: 'Permission Request',
        type: 'Permission Request',
        create: true,
        create_admin: true,
        title: `Request denied by ${req.user.first_name} ${req.user.last_name} to access login`,
        description: `Your request to access the account has been denied by ${req.user.first_name} ${req.user.last_name}.`
      }
      await this._sendNotification(notificationObj)
      await ContactUs.findByIdAndUpdate(
        req.query.queryId,
        {
          $set: { request: 'reject' }
        },
        { new: true }
      )
      await notifications.findByIdAndUpdate(
        req.query.id,
        {
          $set: { permissionRequestStatus: 'decline' }
        },
        { new: true }
      )
      return res.send({
        code: 200,
        message: 'Request denied by User to access login'
      })
    } else {
      const user = await User.findById(req.user._id)

      const subuser = null
      const token = await saveUserAccessAndReturnToken(
        req,
        user,
        'support',
        subuser
      )
      const notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: admin[0]._id.toString(),
        notification_type: 'Permission Request',
        type: 'Permission Request',
        create: true,
        create_admin: true,
        value_id: req.query.queryId,
        title: `Permission granted by ${user.first_name} ${user.last_name} to access login`,
        description: `Your request to access the account has been accepted by ${user.first_name} ${user.last_name}.`
      }
      await this._sendNotification(notificationObj)
      const contact = await ContactUs.findByIdAndUpdate(
        req.query.queryId,
        {
          $set: { login_token: token.token, request: 'accept' }
        },
        { new: true }
      )
      await notifications.findByIdAndUpdate(
        req.query.id,
        {
          $set: { permissionRequestStatus: 'approved' }
        },
        { new: true }
      )
      return res.json({
        code: 200,
        message: 'Request approved. Access granted.',
        token: contact
      })
    }
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
exports.addCarAndModel = async (req, res) => {
  try {
    const admin = await Admin.find()
    if (req.query.request === 'decline') {
      const notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: admin[0]._id.toString(),
        notification_type: 'Permission Request',
        type: 'Permission Request',
        create: true,
        create_admin: true,
        title: `Request denied by ${req.user.first_name} ${req.user.last_name} to access login`,
        description: `Your request to access the account has been denied by ${req.user.first_name} ${req.user.last_name}.`
      }
      await this._sendNotification(notificationObj)
      await ContactUs.findByIdAndUpdate(
        req.query.queryId,
        {
          $set: { request: 'reject' }
        },
        { new: true }
      )
      return res.send({
        code: 200,
        message: 'Request denied by User to access login'
      })
    } else {
      const user = await User.findById(req.user._id)
      const subuser = null
      const token = await saveUserAccessAndReturnToken(req, user, subuser)
      const notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: admin[0]._id.toString(),
        notification_type: 'Permission Request',
        type: 'Permission Request',
        create: true,
        create_admin: true,
        value_id: req.query.queryId,
        title: `Permission granted by ${user.first_name} ${user.last_name} to access login`,
        description: `Your request to access the account has been accepted by ${user.first_name} ${user.last_name}.`
      }
      await this._sendNotification(notificationObj)
      const contact = await ContactUs.findByIdAndUpdate(
        req.query.queryId,
        {
          $set: { login_token: token.token, request: 'accept' }
        },
        { new: true }
      )
      return res.json({
        code: 200,
        message: 'Request approved. Access granted.',
        token: contact
      })
    }
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
