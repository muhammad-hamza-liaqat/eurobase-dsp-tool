const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')
const i18n = require('i18n')
const User = require('../models/user')
const Admin = require('../models/admin')
const { itemAlreadyExists, itemExists } = require('../middleware/utils')
const express = require('express')
var jwt = require('jsonwebtoken')
var path = require('path')
const app = express()
const APP_NAME = process.env.APP_NAME
const { capitalizeFirstLetter } = require('../shared/helpers')
const ejs = require('ejs')
// const fs = require("fs");
var pdf = require('html-pdf')
var mime = require('mime-types')
// app.set('view engine', 'jade');
var mailer = require('express-mailer')
var moment = require('moment')
var mongoose = require('mongoose')

const viewsDirectory = path.join(__dirname, '../../views');
app.set('view engine', 'ejs');
app.set('views', viewsDirectory);

mailer.extend(app, {
  from: 'm.hamza1782@gmail.com',
  host: 'smtp.gmail.com', // hostname
  secureConnection: true, // use SSL
  port: 465, // port for secure SMTP
  transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
  auth: {
    user: 'm.hamza1782@gmail.com',
    pass: ''
    // user: "nodeteamemail@gmail.com",
    // pass: "ukgyoobypzpiuuvb",
    // user: "testing.team0012@gmail.com",
    // pass: "Testingteam1234",
  }
})

/**
 * Sends email
 * @param {Object} data - data
 * @param {boolean} callback - callback
 */
//  const sendEmail = async (data, callback) => {
//   const auth = {
//     auth: {
//       api_key: process.env.EMAIL_SMTP_API_MAILGUN,
//       domain: process.env.EMAIL_SMTP_DOMAIN_MAILGUN
//     }
//   }
//   const transporter = nodemailer.createTransport(mg(auth))
//   const mailOptions = {
//     from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
//     to: `${data.user.name} <${data.user.email}>`,
//     subject: data.subject,
//     html: data.htmlMessage
//   }
//   transporter.sendMail(mailOptions, (err) => {
//     if (err) {
//       return callback(false)
//     }
//     return callback(true)
//   })
// }

const sendEmail = async (data, callback) => {
  const auth = {
    auth: {
      api_key: process.env.EMAIL_SMTP_API_MAILGUN,
      domain: process.env.EMAIL_SMTP_DOMAIN_MAILGUN,
    },
  };

  const transporter = nodemailer.createTransport(mg(auth));

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: `${data.user.name} <${data.user.email}>`,
    subject: data.subject,
    html: data.htmlMessage,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error('Error sending email:', err);
      return callback(false);
    }
    return callback(true);
  });
};


module.exports = { sendEmail }
/**
 * Prepares to send email
 * @param {string} user - user object
 * @param {string} subject - subject
 * @param {string} htmlMessage - html message
 */
const prepareToSendEmail = (user, subject, htmlMessage) => {
  user = {
    name: user.name,
    email: user.email,
    verification: user.verification
  }
  const data = {
    user,
    subject,
    htmlMessage
  }
  if (process.env.NODE_ENV === 'production') {
    sendEmail(data, (messageSent) =>
      messageSent
        ? console.log(`Email SENT to: ${user.email}`)
        : console.log(`Email FAILED to: ${user.email}`)
    )
  } else if (process.env.NODE_ENV === 'development') {
    console.log(data)
  }
}

module.exports = {
  /**
   * Checks User model if user with an specific email exists
   * @param {string} email - user email
   * @param {Boolean} throwError - whenther to throw error or not
   */
  async emailExists(email) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          email
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  async mobileExists(phone_number) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          phone_number
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'PHONE_NUMBER_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  /**
   * Checks User model if user with an specific username exists
   * @param {string} username - user username
   * @param {Boolean} throwError - whenther to throw error or not
   */

  async usernameExists(username, throwError = false) {
    return new Promise((resolve, reject) => {
      User.findOne({
        username: username
      })
        .then((item) => {
          var err = null
          if (throwError) {
            itemAlreadyExists(err, item, reject, 'USERNAME ALREADY EXISTS')
          }
          resolve(item ? true : false)
        })
        .catch((err) => {
          var item = null
          itemAlreadyExists(err, item, reject, 'ERROR')
          resolve(false)
        })
    })
  },

  /**
   * Checks Admin model if admin with an specific email exists
   * @param {string} email - admin email
   * @param {Boolean} throwError - whenther to throw error or not
   */
  async adminEmailExists(email, throwError = false) {
    return new Promise((resolve, reject) => {
      Admin.findOne({
        email: email
      })
        .then((item) => {
          var err = null
          if (throwError) {
            itemAlreadyExists(err, item, reject, 'EMAIL ALREADY EXISTS')
          }
          resolve(item ? true : false)
        })
        .catch((err) => {
          var item = null
          itemAlreadyExists(err, item, reject, 'ERROR')
          resolve(false)
        })
    })
  },

  /**
   * Checks User model if user with an specific email exists but excluding user id
   * @param {string} id - user id
   * @param {string} email - user email
   */
  async emailExistsExcludingMyself(id, email) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          email,
          _id: {
            $ne: id
          }
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  /**
   * Checks User model if user with an specific mobile exists but excluding user id
   * @param {string} id - user id
   * @param {string} email - user email
   */
  async checkMobileExistsExcludingMyself(id, phone_no) {
    return new Promise((resolve, reject) => {
      model.User.findOne({
        where: {
          phone_no: phone_no,
          id: {
            [Op.not]: id
          }
        }
      }).then((item) => {
        if (item) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  },

  /**
   * Sends email common
   * @param {string} locale - locale
   * @param {Object} mailOptions - mailOptions object
   * @param {string} template - template
   */

  async sendEmail(locale, mailOptions, template) {
    mailOptions.website_url = process.env.WEBSITE_URL
    app.mailer.send(
      `${locale}/${template}`,
      mailOptions,
      function (err, message) {
        if (err) {
          console.log('There was an error sending the email' + err)
        } else {
          console.log('Mail sent')
        }
      }
    )
  },

  /**
   * Sends reset password email
   * @param {string} locale - locale
   * @param {Object} user - user object
   */

  async sendResetPasswordEmailMessage(locale, user) {
    i18n.setLocale(locale)
    const subject = i18n.__('forgotPassword.SUBJECT')
    const htmlMessage = i18n.__(
      'forgotPassword.MESSAGE',
      user.email,
      process.env.FRONTEND_URL,
      user.verification
    )
    prepareToSendEmail(user, subject, htmlMessage)
  },



  async sendOtpInEmail(locale, data, template) {
    // mailOptions.website_url = process.env.WEBSITE_URL
    app.mailer.send(
      `${locale}/${template}`,
      {
        // email view path
        to: data.email,
        subject: `Verify Email - ${APP_NAME}`,
        // name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(user.last_name)}`,
        name: 'test',
        OTP: data.otp_for_verification,
        website_url: process.env.WEBSITE_URL,
        Image_url: process.env.STORAGE_PATH_HTTP
      },
      function (err) {
        if (err) {
          console.log('There was an error sending the email' + err)
        }
        console.log('VERIFICATION EMAIL SENT')
        return true
      }
    )
  },

  async sendCodeInEmail(locale, data, template) {
    console.log('template', data)

    app.mailer.send(
      `${locale}/${template}`,
      {
        // email view path
        to: data.email,
        // to: 'promatics.ajay.k@gmail.com',
        subject: `Generated code - ${APP_NAME}`,
        // name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(user.last_name)}`,
        name: 'test',
        CODE: data.code,
        website_url: process.env.WEBSITE_URL,
        Image_url: process.env.STORAGE_PATH_HTTP
      },
      function (err) {
        if (err) {
          console.log('There was an error sending the email' + err)
        }
        console.log('CODE SENT')
        return true
      }
    )
  },

  async sendOtpForCompleteOrder(locale, data, template) {
    app.mailer.send(
      `${locale}/${template}`,
      {
        // email view path
        to: data.user_id.email,
        // to: 'promatics.ajay.k@gmail.com',
        subject: `Verification Otp For Complete Order - ${APP_NAME}`,
        // name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(user.last_name)}`,
        name: 'test',
        CODE: data.code,
        website_url: process.env.WEBSITE_URL,
        Image_url: process.env.STORAGE_PATH_HTTP
      },
      function (err) {
        if (err) {
          console.log('There was an error sending the email' + err)
        }
        console.log('CODE SENT')
        return true
      }
    )
  },

  async userExists(model, email, throwError = true) {
    return new Promise((resolve, reject) => {
      model
        .findOne({
          email: email
        })
        .then((item) => {
          var err = null
          if (throwError) {
            itemAlreadyExists(err, item, reject, 'EMAIL ALREADY EXISTS')
          }
          resolve(item ? item : false)
        })
        .catch((err) => {
          var item = null
          itemAlreadyExists(err, item, reject, 'ERROR')
          resolve(false)
        })
    })
  },
  async socialIdExists(model, social_id, social_type, throwError = false) {
    return new Promise((resolve, reject) => {
      model
        .findOne({
          social_id: social_id,
          social_type: social_type
        })
        .then((item) => {
          var err = null
          if (throwError) {
            itemAlreadyExists(err, item, reject, 'USER ALREADY EXISTS')
          }
          resolve(item ? true : false)
        })
        .catch((err) => {
          var item = null
          itemAlreadyExists(err, item, reject, 'ERROR')
          resolve(false)
        })
    })
  }
}
async function sendVerificationEmail(locale, user, template) {
  // user = JSON.parse(JSON.stringify(user));
  app.mailer.send(
    `${locale}/${template}`,
    {
      to: user.email,
      subject: `Verify Email - ${APP_NAME}`,
      company_name: user.company_name,
      company_email: user.email,
      name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(
        user.last_name
      )}`,
      verification_link: `${process.env.VERIFICATION_LINK}/${user._id}`
    },
    function (err) {
      if (err) {
        console.log('There was an error sending the email' + err)
      }
      return true
    }
  )
}
const sendEmailToUser = async (sub, html, email) => {
  const mailgunAuth = {
    auth: {
      api_key: process.env.EMAIL_SMTP_API_MAILGUN,
      domain: process.env.EMAIL_SMTP_DOMAIN_MAILGUN
    }
  }

  const transporter = nodemailer.createTransport(mg(mailgunAuth))

  const senderName = 'Eurobosse'
  const senderEmail = 'dev.testprom@gmail.com'
  const recipientEmail = email
  const subject = sub
  const htmlContent = html

  const mailOptions = {
    from: `<${senderEmail}>`,
    to: recipientEmail,
    subject: subject,
    html: htmlContent
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err.message)
    } else {
      console.log('Email sent successfully:', info.messageId)
    }
  })
}
async function sendReply(locale, mailOptions, template) {
  mailOptions.website_url = process.env.WEBSITE_URL
  app.mailer.send(
    `${locale}/${template}`,
    mailOptions,
    function (err, message) {
      if (err) {
        console.log('There was an error sending the email' + err)
      } else {
        console.log('Mail sent')
      }
    }
  )
}
const sendPasswordToUser = (locale,mailOptions,template) => {
  try {
    mailOptions.website_url = process.env.WEBSITE_URL
    app.mailer.send(
      `${locale}/${template}`,
      mailOptions,
      function (err, message) {
        if (err) {
          console.log('There was an error sending the email' + err.message)
        } else {
          console.log('Mail sent')
        }
      }
    )
    return true
  } catch (error) {
    console.error(`Failed to send email: ${error.message}`)
    return false
  }
}
const sendEmailInvoice = async (locale, data, email, htmlContent) => {
  try {
    app.mailer.send(
      `${locale}/${htmlContent}`,
      {
        to: email,
        subject: data.subject,
        appName: APP_NAME,
        name: data.name,
        message: data.message,
        invoice_link:data.invoice_link,
        name: `${capitalizeFirstLetter(
          data.first_name
        )} ${capitalizeFirstLetter(data.last_name)}`
      },
      function (err) {
        if (err) {
          console.log('There was an error sending the email' + err).message
        }
        console.log('VERIFICATION EMAIL SENT')
        return true
      }
    )
  } catch (error) {
    console.error(`Failed to send email: ${error.message}`)
    return false
  }
}
async function sendPasswordToSubUser(locale, mailOptions, template) {
  mailOptions.website_url = process.env.WEBSITE_URL
  app.mailer.send(
    `${locale}/${template}`,
    mailOptions,
    function (err, message) {
      if (err) {
        console.log('There was an error sending the email' + err)
      } else {
        console.log('Mail sent')
      }
    }
  )
}
async function sendOtpToUser(locale, mailOptions, template) {
  mailOptions.website_url = process.env.WEBSITE_URL
  app.mailer.send(
    `${locale}/${template}`,
    mailOptions,
    function (err, message) {
      if (err) {
        console.log('There was an error sending the email' + err)
      } else {
        console.log('Mail sent')
      }
    }
  )
}
async function sendVerificationEmailforapp(locale, user, template) {
  // user = JSON.parse(JSON.stringify(user));
  app.mailer.send(
    `${locale}/${template}`,
    {
      to: user.email,
      subject: `Verify Email - ${APP_NAME}`,
      company_name: user.company_name,
      company_email: user.email,
      name: `${capitalizeFirstLetter(user.first_name)} ${capitalizeFirstLetter(
        user.last_name
      )}`,
      verification_link: `${process.env.VERIFICATION_LINK}/${user._id}`
    },
    function (err) {
      if (err) {
        console.log('There was an error sending the email' + err)
      }
      return true
    }
  )
}
module.exports = {
  sendReply,
  sendPasswordToUser,
  sendVerificationEmail,
  sendEmailInvoice,
  sendPasswordToSubUser,
  sendVerificationEmailforapp,
  sendOtpToUser, 
  sendEmail
}
