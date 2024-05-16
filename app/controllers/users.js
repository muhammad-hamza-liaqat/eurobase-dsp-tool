const {
  handleError,
  getIP,
  buildErrObject,
  itemNotFound,
  uploadFileLocal,
  getCountryCode,
  // sendPushNotification,
  downloadExcelFile,
  downloadPdfFile,
  downloadCSVFile,
  checkDynamicPermissions
} = require('../middleware/utils')
const db = require('../middleware/db')
const fastCsv = require('fast-csv')
const VatModel = require('../models/VatModel')
const {
  createItem,
  getItemThroughId,
  updateItemThroughId,
  updateItem,
  updateItems,
  countDocuments,
  deleteItem,
  getItemsCustom,
  aggregateCollection,
  getItemCustom,
  sendNotification,
  downloadCsv
} = require('../shared/core')
const xlsx = require('xlsx')
const {
  getUserIdFromToken,
  uploadFile,
  capitalizeFirstLetter,
  validateFileSize,
  objectToQueryString,
  generatePassword
} = require('../shared/helpers')
var mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { GET, POST } = require('../middleware/axios')
const { matchedData } = require('express-validator')
var fs = require('fs')
var moment = require('moment')
var path = require('path')
var mime = require('mime-types')
var uuid = require('uuid')
const emailer = require('../middleware/emailer')
const {
  sendAdminPushNotification,
  sendPushNotification
} = require('../../config/firebase')

const STORAGE_PATH_HTTP = process.env.STORAGE_PATH_HTTP
const STORAGE_PATH = process.env.STORAGE_PATH
const countries = require('country-state-city').Country
const log4js = require('log4js')
const states = require('country-state-city').State
const cities = require('country-state-city').City
let Country = require('country-state-city').Country
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const otplib = require('otplib')
const ClickModel = require('../models/click')
const SubscriptionModel = require('../models/subscription')
const csv = require('csvtojson')
const ejs = require('ejs')
var pdf = require('html-pdf')
var mime = require('mime-types')
var path = require('path')
const cron = require('node-cron')

// aws s3 with contabo config

const aws = require('aws-sdk')
const s3 = new aws.S3({
  endpoint: process.env.CONTABO_END_POINT,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY_ID,
  s3BucketEndpoint: true
})

const dir___2 = '/var/www/html/eurobose-rest-apis/'
const dir__1 = ''
// * models

const RequestModel = require('../models/requestManagement')
const CMS = require('../models/cms')
const User = require('../models/user')
const Faq = require('../models/faq')
const EmailModel = require('../models/emailFollow')
const FcmDevice = require('../models/fcm_devices')
const carlogos = require('../models/carlogos')
const carmodel = require('../models/carmodel')
const Test = require('../models/test')
const Sub_user = require('../models/sub_user')
const Store = require('../models/store')
const TodoModel = require('../models/todo')
const AboutUsOther = require('../models/about_us_other')
const Emails = require('../models/emails')
const Car = require('../models/cars')
const Client = require('../models/client')
const Invoice = require('../models/invoice')
const freeInvoice = require('../models/free_invoice')
const Admin = require('../models/admin')
const Quote = require('../models/quote')
const ContactUs = require('../models/contact_us')
const Subscription = require('../models/subscription')
const UserFeature = require('../models/user_feature')
const FreeQuote = require('../models/free_quote')
const Calendar = require('../models/calendar')
const insuredPerson = require('../models/insuredperson')
const services = require('../models/services')
const notifications = require('../models/notification')
const AdminModel = require('../models/admin')
const auth = require('../middleware/auth')
const AppInvoiceModel = require('../models/appInvoice')

// const userdevices = require("../models/notification");
// Twilio
const AccessToken = require('twilio').jwt.AccessToken
var twilio = require('twilio')
const { response } = require('express')
const { captureRejectionSymbol } = require('events')

// Used when generating any kind of tokens
// To set up environmental variables, see http://twil.io/secure
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioApiKey = process.env.TWILIO_API_KEY
const twilioApiSecret = process.env.TWILIO_API_SECRET
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

const ClientCapability = require('twilio').jwt.ClientCapability
const VoiceResponse = require('twilio').twiml.VoiceResponse

const client = require('twilio')(twilioAccountSid, twilioAuthToken)

const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password
    user.save((err, item) => {
      itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(item)
    })
  })
}

/**
 * ------------PUSH NOTIFICATION-------------------
 */

exports._sendNotification = async (data) => {
  try {
    let fcmTokens
    let senderDetails = false
    if (data.user) {
      let user = await User.findById(data.receiver_id)
      fcmTokens = user.fcmTokens
      senderDetails = true
    } else {
      const admin = await Admin.find()
      fcmTokens = admin[0].fcmTokens
      senderDetails = true
    }

    if (senderDetails) {
      let description, title, notification_type
      let notificationObj = {
        sender_id: null,
        receiver_id: data.receiver_id,
        type: data.type,
        create: data?.create_admin,
        create_admin: data?.create_admin,
        notification_type: data.notification_type,
        typeId: data.typeId
      }
      if (data.type == 'bookings') {
        description = data.description
        title = data.title
      } else if (data.type == 'approval') {
        description = 'Booking Genrated'
        title = 'Booking Generated'
      } else if (data.type == 'create_account') {
        title = data.title
        description = data.body
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
        title = data.title
        description = data.description
        notification_type = data.type
      } else if (data.type === 'Subscription Plan') {
        title = data.title
        description = data.description
      } else if (data.type === 'Appointment') {
        title = data.title
        description = data.description
        notification_type = data.notification_type
      } else {
        title = data.title
        description = data.description
      }

      notificationObj.description = description
      notificationObj.title = title
      if (notification_type) {
        notificationObj.notification_type = notification_type
      }
      try {
        if (data.create) {
          // delete data.create;
          if (data.create_admin) {
            notificationObj.is_admin = true
            console.log(notificationObj)
            await createItem(notifications, notificationObj)
            console.log('create_admin')
          } else {
            console.log('not')
            await createItem(notifications, notificationObj)
          }
        }
      } catch (err) {
        console.log('main err: ', err)
      }
      fcmTokens = fcmTokens?.map((item) => item.token) || []
      if (fcmTokens.length > 0) {
        try {
          if (data.user) {
            fcmTokens.map(
              async (item) =>
                await sendPushNotification(
                  item,
                  notificationObj.title,
                  notificationObj.description
                )
            )
          } else {
            fcmTokens.map(
              async (item) =>
                await sendAdminPushNotification(
                  item,
                  notificationObj.title,
                  notificationObj.description
                )
            )
          }
        } catch (e) {
          console.log(e, 'error')
        }
      }
    } else {
      throw buildErrObject(422, 'sender detail is null')
    }
  } catch (err) {
    console.log(err.message, 'error')
    throw buildErrObject(422, err.message)
  }
}
/**
 * --------------Function For Generate Otp---------
 *
 */

// cron.schedule("0 0 */5 * *", SellerPayment, {
//   timezone: "Asia/Kolkata",
// });

exports.downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id })
      .populate({ path: 'quotation_id', populate: { path: 'type_of_car' } })
      .populate('clientId')
    if (!invoice) {
      return res.send({ code: 404, message: 'Invoice not found' })
    }
    const contents = await fs.readFileSync('./views/en/invoice.ejs', 'utf8')
    var html = await ejs.render(contents, {
      amount: invoice?.total,
      regNumber: invoice.quotation_id?.regNumber,
      name: invoice?.clientId?.firstName + ' ' + invoice?.clientId?.lastName,
      email: invoice?.clientId?.email,
      data: invoice?.parts,
      createdDate: invoice?.createdDate,
      car:
        invoice?.quotation_id?.type_of_car?.main_title +
        ' ' +
        invoice?.quotation_id?.model
    })
    /*
     * Call a  user define method to generate PDF.
     */
    const fileName = 'invoice-' + Date.now()
    const heading = 'testing'
    var options = {
      format: 'A4',
      width: '14in',
      orientation: 'landscape',
      height: '21in',
      timeout: 540000
    }

    await pdf
      .create(html, options)
      .toFile(
        'public_v1/invoice/' + fileName + '.pdf',
        async function (err, pdfV) {
          if (err) return console.log(err)

          const fullPath =
            process.env.API_URL2 + 'public_v1/invoice/' + fileName + '.pdf'

          const filename = path.basename(fullPath)
          const contentType = mime.lookup(fullPath)

          res.setHeader(
            'Content-disposition',
            'attachment; filename=' + filename
          )
          res.setHeader('Content-type', contentType)

          const filestream = await fs.createReadStream(pdfV.filename)

          filestream.on('data', () => {
            console.log('reading.....')
          })

          filestream.on('open', function () {
            console.log('Open-------------------->')

            filestream.pipe(res)
          })

          filestream.on('end', () => {
            fs.unlink(pdfV.filename, (err) => {
              if (err) throw err
              console.log('successfully deleted ', fullPath)
            })
          })
          filestream.on('error', (err) => {
            console.log(err)
          })
          filestream.on('close', () => {
            console.log('Stream closed now')
          })
          // }
        }
      )
  } catch (error) {
    return res.status(500).json({
      code: 500,
      error: error.message,
      message: 'internal server error'
    })
  }
}

exports.findallcarlogos = async (req, res) => {
  try {
    const data = req.query
    const limit = data.limit ? parseInt(data.limit) : 100
    const offset = data.offset ? parseInt(data.offset) : 0
    let parent_artForm, subcategory
    const subcategoryIds = data._id
    subcategory = await carlogos.find({ parent_id: null }).populate({
      path: 'subCategories',
      select: '_id main_title logo'
    })
    let whereObj = {}
    let results = { ...{ code: 200 }, subcategory: subcategory }
    return res.status(200).json(results)
  } catch (error) {
    handleError(res, error)
  }
}

exports.addcarWithlogo = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    const item = await createItem(carmodel, req.body)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.findallcarmodel = async (req, res) => {
  try {
    const findall = await carmodel.find({
      user_id: req.user._id,
      main_logo_id: req.query.main_logo_id
    })
    res.status(200).json({
      code: 200,
      staus: findall
    })
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Upload Media function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

exports.uploadUserMedia = async (req, res) => {
  try {
    if (!req.files || !req.files.media || !req.body.path) {
      return res.status(422).json({
        code: 422,
        message: 'MEDIA OR PATH MISSING'
      })
    }

    console.log(req.files.media, req.body.path)
    let media = await uploadFile({
      file: req.files.media,
      path: `${STORAGE_PATH}/${req.body.path}`
    })

    let mediaurl = `${STORAGE_PATH_HTTP}/${req.body.path}/${media}`

    const mimeType = mime.lookup(media)

    return res.status(200).json({
      code: 200,
      media,
      mimeType: mimeType
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      code: 500,
      message: 'Internal Server Error'
    })
  }
}

/**
 * Upload Multiple Media function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

exports.uploadMultipleUserMedia = async (req, res) => {
  try {
    if (!req.files.medias || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: 'MEDIA OR PATH MISSING'
      })
    }
    let mediasUrl = []
    req.files.medias
    if (!Array.isArray(req.files.medias)) {
      let media = await uploadFile({
        file: req.files.medias,
        path: `${STORAGE_PATH}/${req.body.path}`
      })
      mediasUrl.push(`${STORAGE_PATH_HTTP}/${req.body.path}/${media}`)
    } else {
      for (let i = 0; i < req.files.medias.length; i++) {
        let media = await uploadFile({
          file: req.files.medias[i],
          path: `${STORAGE_PATH}/${req.body.path}`
        })
        mediasUrl.push(`${STORAGE_PATH_HTTP}/${req.body.path}/${media}`)
      }
    }
    return res.status(200).json({
      code: 200,
      paths: mediasUrl
    })
  } catch (error) {
    handleError(res, error)
  }
}

const createLogs = (req) => {
  var currentData = moment().format('DD-MM-YYYY')
  if (fs.existsSync(dir___2 + 'logs/access_' + currentData + '.log')) {
    //file exists
  } else {
    fs.createWriteStream(dir___2 + 'logs/access_' + currentData + '.log', {
      mode: 0o777
    })
  }

  log4js.configure({
    appenders: {
      cheese: {
        type: 'file',
        filename: dir___2 + 'logs/access_' + currentData + '.log'
      }
    },
    categories: { default: { appenders: ['cheese'], level: 'info' } }
  })
  // receipt_url
  const logger = log4js.getLogger('access_' + currentData)
  try {
    return logger.info(JSON.stringify(req))
  } catch (e) {
    //console.loge, "In Query in Log");
  }
}

/********************
 * Public functions *
 ********************/

exports.getCms = async (req, res) => {
  try {
    const item = await db.getCms(CMS, req.params)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getUserProfile = async (req, res) => {
  try {
    const item = await getItemThroughId(User, req.user._id)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.editUserProfile = async (req, res) => {
  try {
    const data = req.body
    let countryName = Country.getCountryByCode(data?.country)
    let stateName = states.getStateByCode(data?.state)
    let payload = {
      city: data?.city !== null && data?.city,
      state: stateName?.name !== null && stateName?.name,
      country: countryName?.name !== null && countryName?.name,
      pincode: data?.zipcode !== null && data?.zipcode
    }
    data.full_address = payload
    const profile = await updateItem(User, { _id: req.user._id }, data)
    return res.status(200).json({ code: 200, profile })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCountries = async (req, res) => {
  try {
    return res.status(200).json(countries.getAllCountries())
  } catch (error) {
    handleError(res, error)
  }
}

exports.getStates = async (req, res) => {
  try {
    return res
      .status(200)
      .json(states.getStatesOfCountry(req.query.country_code))
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCities = async (req, res) => {
  try {
    if (!req.query.state_code) {
      return res
        .status(200)
        .json(cities.getCitiesOfCountry(req.query.country_code))
    } else {
      return res
        .status(200)
        .json(
          cities.getCitiesOfState(
            req.query.country_code,
            req.query.state_code,
            req.query.name
          )
        )
    }
  } catch (error) {
    handleError(res, error)
  }
}

exports.createSubUser = async (req, res) => {
  try {
    const data = req.body

    const user = await User.findOne({ email: data.email })
    const subuser = await Sub_user.findOne({ email: data.email })
    if (user || subuser) {
      return res
        .status(200)
        .send({ status: false, code: 409, message: 'email already in use' })
    }
    if (req.body.user_type === 'expert') {
      req.body.View_A_Quote = true
    } else if (req.body.user_type === 'super_user') {
      req.body.View_A_Quote = true
      req.body.quote = true
      req.body.Access_To_Invoice = true
      req.body.create_customers = true
      req.body.Access_the_calendar = true
      req.body.Access_The_profile = true
      req.body.Access_The_FreeQuote = true
      req.body.Access_The_CarList = true
      req.body.Access_The_UserAuthorization = true
      req.body.create_customers = true
    } else if (req.body.user_type === 'body') {
      req.body.View_A_Quote = true
      req.body.quote = true
      req.body.Access_To_Invoice = true
      req.body.create_customers = true
      req.body.Access_the_calendar = true
      req.body.Access_The_profile = true
      req.body.Access_The_FreeQuote = true
      req.body.Access_The_CarList = true
      req.body.Access_The_UserAuthorization = true
    } else if (req.body.user_type === 'body_work_subcontractor') {
      req.body.View_A_Quote = true
      req.body.quote = true
      req.body.Access_To_Invoice = true
      req.body.create_customers = true
      req.body.Access_the_calendar = true
      req.body.Access_The_profile = true
      req.body.Access_The_FreeQuote = true
      req.body.Access_The_CarList = true
      req.body.Access_The_UserAuthorization = true
    }
    data.user_id = req.user._id
    const generate_password = await generatePassword(10)
    console.log(generate_password)
    data.password = generate_password
    const response = await Sub_user.create(data)
    await emailer.sendPasswordToSubUser(
      req.getLocale(),
      {
        to: data.email,
        name: `${data.first_name} ${data.last_name}`,
        userHasAccessToQuote: data?.quote,
        userHasAccessToCalendar: data?.access_the_calendar,
        userHasAccessToWorkshopSchedule: data?.access_the_workshop_schedule,
        userHasAccessToChangePrices: data?.change_prices,
        userHasAccessToInvoices: data?.make_invoices,
        userHasAccessToCreateCustomers: data?.create_customers,
        userHasAccessToCreateRepairOrder: data?.create_repair_order,
        password: generate_password,
        subject: 'Eurobose Invitation',
        email: data.email,
        logo: process.env.LOGO,
        link: process.env.App_Url
      },
      'sendPasswordToSubUser'
    )
    const garrage = await User.findById(req.user._id)
    let newEmployees = garrage?.totalEmployees + 1
    await User.findByIdAndUpdate(req.user._id, {
      totalEmployees: newEmployees
    })
    res.status(200).json({ code: 200, user: response })
  } catch (error) {
    return res
      .status(500)
      .json({ code: 500, message: 'internal error', error: error.message })
  }
}

exports.editSubUser = async (req, res) => {
  try {
    const data = req.body
    // data.user_id = req.user._id;
    const sub_user = await Sub_user.findById(data.id)
    await updateItem(Sub_user, { _id: data.id }, data)
    if (data.password) await updatePassword(data.password, sub_user)
    res.status(200).json({ code: 200, status: 'profile updated' })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSubUsers = async (req, res) => {
  try {
    const data = req.query
    let condition = {
      user_id: req.user._id
    }
    if (data.id) condition._id = data.id
    if (data.type) condition.user_type = data.type
    condition.offset ? +condition.offset : 0
    condition.limit ? +condition.limit : 10
    const sub_user_list = await getItemsCustom(Sub_user, condition)
    res.status(200).json({
      code: 200,
      sub_user_list: data.id ? sub_user_list.data[0] : sub_user_list
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.addStore = async (req, res) => {
  try {
    const data = req.body
    data.admin_id = req.user._id
    const store = await createItem(Store, data)
    res.status(200).json({ code: 200, store })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.getStore = async (req, res) => {
  try {
    const data = req.query
    let stores
    data.admin_id = req.user._id
    if (data.id) {
      stores = await getItemCustom(
        Store,
        { _id: data.id, admin_id: data.admin_id },
        undefined,
        undefined
      )
    } else {
      data.offset ? +data.offset : 0
      data.limit ? +data.limit : 10
      stores = await getItemsCustom(
        Store,
        data,
        undefined,
        undefined,
        { createdAt: -1 },
        data.limit,
        data.offset
      )
    }
    res.status(200).json({ code: 200, stores })
  } catch (error) {
    handleError(res, error)
  }
}

exports.editStore = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    const sub_user = await Store.findById(data.id)
    await updateItem(Store, { _id: data.id }, data)
    if (data.password) await updatePassword(data.password, sub_user)
    res.status(200).json({ code: 200, status: 'profile updated' })
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteStore = async (req, res) => {
  try {
    const data = req.body
    res
      .status(200)
      .json({ code: 200, status: await deleteItem(Store, data.id) })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCms = async (req, res) => {
  try {
    const item = await getItemCustom(CMS, { type: req.params.type })
    return res.status(200).json({ code: 200, item })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getAboutUsOther = async (req, res) => {
  try {
    const data = req.query
    let condition = {}
    if (data.type) condition.type = data.type
    const response = await getItemsCustom(
      AboutUsOther,
      condition,
      undefined,
      undefined,
      { createdAt: -1 }
    )
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getAboutUsById = async (req, res) => {
  try {
    const response = await getItemCustom(AboutUsOther, { _id: req.params.id })
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getEmails = async (req, res) => {
  try {
    return res.status(200).json({
      code: 200,
      response: await getItemsCustom(Emails, { user_id: req.user._id })
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.addEmails = async (req, res) => {
  try {
    const { email, resend } = req.body
    const userId = req.user._id

    const primaryUser = await User.findById(userId)

    if (!resend) {
      const [userExists, secondary_emails, subUserExists] = await Promise.all([
        User.findOne({ email: email }),
        User.findOne({ 'secondary_emails.email': email }),
        Sub_user.findOne({ email: email })
      ])
      if (userExists || secondary_emails || subUserExists) {
        return res.status(409).send({
          code: 409,
          message: 'Email Already in use'
        })
      }
    }

    const randomNumber = Math.floor(Math.random() * 1000000)
    const otp = randomNumber.toString().padStart(6, '0')

    await emailer.sendOtpToUser(
      req.getLocale(),
      {
        to: email,
        name: `${primaryUser.first_name} ${primaryUser.last_name}`,
        otp: otp,
        subject: 'Confirm Email',
        email: email,
        logo: process.env.LOGO
      },
      'confirmEmail'
    )

    const hashedOTP = await bcrypt.hash(otp, 10)

    if (resend) {
      await User.findOneAndUpdate(
        { _id: userId, 'secondary_emails.email': email },
        {
          $set: {
            'secondary_emails.$.verificationOTP': hashedOTP
          }
        }
      )
    } else {
      await User.findByIdAndUpdate(userId, {
        $push: {
          secondary_emails: {
            $each: [
              {
                email: email,
                status: 'active',
                verification_status: false,
                verificationOTP: hashedOTP
              }
            ],
            $position: 0 // This will add the new element at the beginning of the array
          }
        }
      })
    }

    res.status(200).json({ code: 200, message: 'OTP sent successfully' })
  } catch (error) {
    console.error('Error sending OTP:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

exports.confirmSecondaryEmail = async (req, res) => {
  try {
    const { otp, email, resend } = req.body
    const userId = req.user._id

    const user = await User.findById(userId)
    const isEmail = user.secondary_emails.find((item) => item.email === email)
    if (!isEmail) {
      return res.status(404).send({ code: 404, message: 'email not found' })
    }

    const verificationResult = await bcrypt.compare(
      otp,
      isEmail.verificationOTP
    )

    if (verificationResult) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, 'secondary_emails.email': email },
        {
          $set: {
            'secondary_emails.$.verification_status': true,
            'secondary_emails.$.verificationOTP': null
          }
        },
        {
          new: true
        }
      )

      res.status(200).json({
        status: true,
        code: 200,
        message: 'Email reconfirmed successfully',
        user: updatedUser
      })
    } else {
      res.status(400).json({ status: false, code: 400, message: 'Invalid OTP' })
    }
  } catch (error) {
    console.error('Error confirming re-email:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.resendOTP = async (req, res) => {
  try {
    const { otp, email } = req.body
    const userId = req.user._id

    const user = await User.findById(userId)
    const isEmail = user.secondary_emails.find((item) => item.email === email)
    if (!isEmail) {
      return res.status(404).send({ code: 404, message: 'email not found' })
    }

    const verificationResult = await bcrypt.compare(
      otp,
      isEmail.verificationOTP
    )

    if (verificationResult) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, 'secondary_emails.email': email },
        {
          $set: {
            'secondary_emails.$.verification_status': true,
            'secondary_emails.$.verificationOTP': null
          }
        },
        {
          new: true
        }
      )

      res.status(200).json({
        status: true,
        code: 200,
        message: 'Email reconfirmed successfully',
        user: updatedUser
      })
    } else {
      res.status(400).json({ status: false, code: 400, message: 'Invalid OTP' })
    }
  } catch (error) {
    console.error('Error confirming re-email:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

exports.updateDestroyEmail = async (req, res) => {
  try {
    const data = req.body
    let response
    if (data.type == 'update')
      response = await updateItem(Emails, { _id: data.id }, data)
    if ((data.type = 'destroy'))
      response = await deleteItem(Emails, { _id: data.id })
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCarDetails = async (req, res) => {
  try {
    const response = await getItemsCustom(
      Car,
      undefined,
      undefined,
      undefined,
      { createdAt: -1 }
    )
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.client = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    let response = await db.client(Client, req.body)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getClient = async (req, res) => {
  try {
    req.query.user_id = req.query.user_id
      ? mongoose.Types.ObjectId(req.query.user_id)
      : mongoose.Types.ObjectId(req.user._id)
    let response = await db.getClient(Client, req.query)
    return res
      .status(200)
      .json({ code: 200, response, totalCount: response.length })
  } catch (error) {
    handleError(res, error)
  }
}

exports.downloadCsv = async (req, res) => {
  try {
    const data = req.body
    const workSheetColumnName = ['Document_name']
    const response = data.docs.map((doc) => {
      return [doc.document_name]
    })
    const path = await downloadCsv(workSheetColumnName, response)
    return res.status(200).json({ code: 200, path })
  } catch (error) {
    handleError(res, error)
  }
}

exports.invoice = async (req, res) => {
  try {
    const data = req.body
    req.body.user_id = req.user._id
    let response = await db.invoice(Invoice, req.body)
    if (req.body.type == 'create') {
      await updateItem(
        Invoice,
        { _id: mongoose.Types.ObjectId(response.data._id) },
        { total_amount: parseInt(data.total) }
      )
      await updateItem(Quote, {
        _id: mongoose.Types.ObjectId(data.quotation_id)
      })
    }
    // response.save()
    // const shorturl =
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.freeinvoice = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    let response = await db.freeinvoice(freeInvoice, req.body)
    if (req.body.type == 'create') {
      const url = `https://betazone1.promaticstechnologies.com:5011/users/test?_id=${response.data._id}`
      // response.data.sharelink = url
      await updateItem(
        freeInvoice,
        { _id: mongoose.Types.ObjectId(response.data._id) },
        { sharelink: url }
      )
    }
    // response.save()
    // const shorturl =
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.quote = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    let response = await db.quote(Quote, req.body)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.addContactUs = async (req, res) => {
  try {
    const data = req.body

    const item = await createItem(ContactUs, data)
    const admin = await Admin.find()
    let notificationObj = {
      receiver_id_id: admin[0]._id.toString(),
      type: 'contact',
      title: 'Query Created',
      typeId: item.data._id.toString(),
      create_admin: true,
      description:
        data.first_name + ' ' + data.last_name + ' ' + 'has sent the query'
    }
    await this._sendNotification(notificationObj)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getFaqs = async (req, res) => {
  try {
    let data = req.query
    const response = await getItemsCustom(Faq, data, undefined, undefined, {
      createdAt: -1
    })
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.subscription = async (req, res) => {
  try {
    let response = await db.subscription(Subscription, req.body)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.userFeatures = async (req, res) => {
  try {
    return res.status(200).json({
      code: 200,
      response: await getItemThroughId(UserFeature, '65278f5c204c0e514eeb904c')
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.freeQuotes = async (req, res) => {
  try {
    req.body.garage_user_id = req.user._id
    return res
      .status(200)
      .json({ code: 200, response: await db.freeQuotes(FreeQuote, req.body) })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSubscription = async (req, res) => {
  try {
    let response = await Subscription.find()
    return res.status(200).json({ code: 200, data: response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.calendar = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    const locale = req.getLocale()
    let response = await db.calendar(Calendar, req.body, locale)
    console.log(response)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

// ========================partek code ======================================

exports.createinsuredPerson = async (req, res) => {
  try {
    const data = req.body
    req.body.garage_user_id = req.user._id
    if (data.email) {
      const find = await insuredPerson.find({ email: data.email })
      if (find.length > 0) {
        throw buildErrObject(422, 'email Already Present')
      }
    }
    let response = await db.insuredPerson(insuredPerson, req.body)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.sendEmailtoUser = async (req, res) => {
  try {
    const data = req.body
    const locale = req.getLocale()
    for (let index = 0; index < req.body.email.length; index++) {
      const element = req.body.email[index]

      const emailObj = {
        to: element,
        verification_code: data.subject,
        name: data.content
      }
      await emailer.sendEmail(locale, emailObj, 'verifyEmail')
    }

    // const item = await emailer.sendForgetPasswordEmail(locale, user, 'verifyEmail

    return res.status(200).json({
      code: 200,
      data: 'sent'
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.editcarmodel = async (req, res) => {
  try {
    const data = req.body
    const profile = await updateItem(User, { _id: req.user._id }, data)
    return res.status(200).json({ code: 200, profile })
  } catch (error) {
    handleError(res, error)
  }
}

exports.findallcarlogos = async (req, res) => {
  try {
    const data = req.query
    const limit = data.limit ? parseInt(data.limit) : 100
    const offset = data.offset ? parseInt(data.offset) : 0
    let parent_artForm, subcategory
    const subcategoryIds = data._id
    let groupedSubcategories
    let cndition = {}
    if (data.id) {
      groupedSubcategories = await carlogos.findOne({ _id: data.id })
    } else {
      groupedSubcategories = await carlogos.aggregate([
        // { $match: cndition },

        {
          $group: {
            _id: '$category_title'
            // firstDocument: { $push: "$$ROOT" }, // Push entire document to subcategories array
          }
        },

        // { $replaceRoot: { newRoot: "$firstDocument" } },
        {
          $lookup: {
            from: 'carlogos',
            localField: '_id',
            foreignField: 'category_title',
            as: 'cars'
          }
        },
        { $skip: offset },
        { $limit: limit }
      ])
    }

    subcategory = await carlogos.find(cndition)
    let whereObj = {}
    let results = { ...{ code: 200 }, subcategory: groupedSubcategories }
    return res.status(200).json(results)
  } catch (error) {
    handleError(res, error)
  }
}

exports.createservices = async (req, res) => {
  try {
    const data = req.body
    req.body.user_id = req.user._id
    // if (data.email) {
    //   const find = await insuredPerson.find({ email: data.email });
    //   if (find.length > 0) {
    //     throw buildErrObject(422, "email Already Present");
    //   }
    // }
    let response = await db.servicesforgarage(services, req.body)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getservices = async (req, res) => {
  try {
    const data = req.query
    // req.body.user_id = req.user._id;
    const condition = {
      user_id: mongoose.Types.ObjectId(req.user._id),
      status: false
    }
    if (data.id) {
      condition._id = mongoose.Types.ObjectId(data.id)
    }

    if (data.status) {
      condition.status = data.status
    }

    if (data.type == 'services') {
      delete condition.status
    }
    // if (data.email) {
    //   const find = await insuredPerson.find({ email: data.email });
    //   if (find.length > 0) {
    //     throw buildErrObject(422, "email Already Present");
    //   }
    // }
    let response = await services.find(condition)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getnotifications = async (req, res) => {
  try {
    const data = req.query
    const userId = req.user._id
    console.log(userId)
    const condition = { receiver_id: userId }
    const notification = await notifications.find({ receiver_id: userId })
    console.log(notification)

    if (data.id) {
      condition._id = mongoose.Types.ObjectId(data.id)
    }

    if (data.services_type) {
      condition.services_type = data.services_type
    }

    const conditionTrue = { user_id: userId, is_seen: true }
    const conditionFalse = { user_id: userId, is_seen: false }

    const [response, countOfTrue, countOfFalse] = await Promise.all([
      notifications.find(condition).sort({ createdAt: -1 }),
      notifications.countDocuments(conditionTrue),
      notifications.countDocuments(conditionFalse)
    ])

    return res.status(200).json({
      code: 200,
      response,
      countOfUnseen: countOfFalse,
      countOfSeen: countOfTrue
    })
  } catch (error) {
    handleError(res, error)
  }
}
exports.deletenotification = async (req, res) => {
  try {
    let response
    const data = req.body
    if (data.id) {
      response = await notifications.deleteOne({ _id: data.id })
    } else if (data.delete_ids) {
      for (const x of data.delete_ids) {
        response = await notifications.deleteOne({ _id: x })
      }
    } else {
      response = await notifications.deleteMany({
        user_id: mongoose.Types.ObjectId(req.user._id)
      })
    }
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteservices = async (req, res) => {
  try {
    let response
    const data = req.body
    if (data.id) {
      response = await notifications.deleteOne({ _id: data.id })
    } else {
      response = await notifications.deleteMany({
        user_id: mongoose.Types.ObjectId(req.user._id)
      })
    }
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.createnotifications = async (req, res) => {
  try {
    const data = req.body

    // req.body.user_id = req.user._id;
    const condition = { user_id: mongoose.Types.ObjectId(req.user._id) }

    // if (data.email) {
    //   const find = await insuredPerson.find({ email: data.email });
    //   if (find.length > 0) {
    //     throw buildErrObject(422, "email Already Present");
    //   }
    // }
    let response = await notifications.create(data)

    this._sendNotification(data)
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteuser = async (req, res) => {
  try {
    let response = await User.deleteOne({
      _id: mongoose.Types.ObjectId(req.user._id)
    })
    return res.status(200).json({ code: 200, response })
  } catch (error) {
    handleError(res, error)
  }
}

exports.updatestatus = async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: id }
    var update = { status: true }

    const user = await services.findOne(filter)
    if (user.status) {
      update = { status: false }
    }

    const data = await services.findOneAndUpdate(filter, update, {
      new: true
    })

    return res.status(200).json({
      code: 200,
      data
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.addFcmToken = async (req, res) => {
  try {
    const data = req.body
    let response
    data.user_id = req.user._id

    const device = await getItemCustom(FcmDevice, {
      device_id: data.device_id
    })
    if (device && device.length > 0) {
      await FcmDevice.updateOne(
        { device_id: data.device_id },
        { $set: { device_token: data.device_token } }
      )
      response = 'updated..'
    } else {
      response = await createItem(FcmDevice, data)
    }
    res.status(200).json({
      code: 200,
      response
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.removeFcmToken = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    res.status(200).json({
      code: 200,
      response: await db.deleteItem(data.device_id, FcmDevice)
    })
  } catch (error) {
    handleError(res, error)
  }
}

async function downloadCsvs(workSheetColumnNames, response) {
  return new Promise((resolve, reject) => {
    try {
      const data = [workSheetColumnNames, ...response]
      const workSheetName = 'user'
      const filePath = '/excel_file/' + Date.now() + '.csv'
      const workBook = XLSX.utils.book_new() //Create a new workbook
      const worksheet = XLSX.utils.aoa_to_sheet(data) //add data to sheet
      XLSX.utils.book_append_sheet(workBook, worksheet, workSheetName) // add sheet to workbook
      XLSX.writeFile(workBook, path.join(process.env.STORAGE_PATH, filePath)) // save file to server
      resolve(STORAGE_PATH_HTTP + filePath)
    } catch (error) {
      reject(buildErrObject(422, error.message))
    }
  })
}

async function downloadCsvsforpdf(workSheetColumnNames, response) {
  return new Promise((resolve, reject) => {
    try {
      const data = [workSheetColumnNames, ...response]
      const workSheetName = 'user'
      const filePath = '/excel_file/' + Date.now() + '.ods'
      const workBook = XLSX.utils.book_new() //Create a new workbook
      const worksheet = XLSX.utils.aoa_to_sheet(data) //add data to sheet
      XLSX.utils.book_append_sheet(workBook, worksheet, workSheetName) // add sheet to workbook
      XLSX.writeFile(workBook, path.join(process.env.STORAGE_PATH, filePath)) // save file to server
      resolve(STORAGE_PATH_HTTP + filePath)
    } catch (error) {
      reject(buildErrObject(422, error.message))
    }
  })
}

exports.downloadCmsCsv = async (req, res) => {
  try {
    const data = req.body
    let path
    if (data.type == 'app' || data.type == 'marketplace') {
      const docs = await typeofDocs.find({ type: 'app', is_deleted: false })
      const workSheetColumnName = ['Document_name']
      const response = docs.map((doc) => {
        return [doc.document_name]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'privacy_policy') {
      const pp = await Privacy_policy.find({
        _id: mongoose.Types.ObjectId('6458c3c7318b303d9b4755b3')
      })
      const workSheetColumnName = ['Description']
      const response = pp.map((pp) => {
        return [removeHTMLTags(pp.description)]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'selling_price') {
      const pp = await Selling_price.find({
        _id: mongoose.Types.ObjectId('64f013495695d1378e70446f')
      })
      const workSheetColumnName = ['Shared', 'Exclusive']
      const response = pp.map((pp) => {
        return [pp.shared, pp.exclusive]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'faq') {
      const faq = await Faq.find({ for: data.for })
      const workSheetColumnName = ['Question', 'Answer']
      const response = faq.map((faq) => {
        return [faq.ques, faq.ans]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'legal') {
      const legal = await Legal_terms.find({
        _id: mongoose.Types.ObjectId('6458c35c5d09013b05b94e37')
      })
      const workSheetColumnName = ['Description']
      const response = legal.map((legal) => {
        return [removeHTMLTags(legal.description)]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'price_tips') {
      const price_tips = await db.getItems(priceTipforquestion, {
        for: data.for,
        is_deleted: false
        // category:data.category
      })
      const workSheetColumnName = ['ques', 'answer']
      const response = price_tips.map((faq) => {
        return [faq.ques, faq.ans]
      })
      path = await downloadCsv(workSheetColumnName, response)
    } else if (data.type == 'customer_csv') {
      const price_tips = await Sub_user.find({ user_id: req.user._id })

      const workSheetColumnName = ['first_name', 'last_name', 'email']
      const response = price_tips.map((faq) => {
        return [faq.first_name, faq.last_name, faq.email]
      })

      path = await downloadCsvs(workSheetColumnName, response)
    } else if (data.type == 'customer_pdf') {
      const price_tips = await Sub_user.find({ user_id: req.user._id })

      const workSheetColumnName = ['first_name', 'last_name', 'email']
      const response = price_tips.map((faq) => {
        return [faq.first_name, faq.last_name, faq.email]
      })

      path = await downloadCsvsforpdf(workSheetColumnName, response)
    }

    res.status(200).json({
      code: 200,
      path,
      status: path
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.GRAPHAPI = async (req, res) => {
  try {
    const data = req.body
    const getcontentonline1 = await Invoice.aggregate([
      {
        $match: { user_id: mongoose.Types.ObjectId(req.user._id) }
      },
      {
        $addFields: {
          total: { $toDouble: '$total' } // Convert total from string to double
        }
      },
      {
        $group: {
          // _id: { $month: "$createdAt" }, // Group by month
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          total_price: { $sum: '$total' },
          // total_vat: { $sum: "$Vat" },
          data: { $push: '$$ROOT' } // Collect documents within each group
        }
      },
      // {
      //   $lookup: {
      //     from: "contents",
      //     localField: "data.content_id",
      //     foreignField: "_id",
      //     as: "content_id",
      //   },
      // },
      {
        $sort: { createdAt: -1 } // Sort by month in ascending order (optional)
      }
    ])
    res.status(200).json({
      code: 200,
      response: getcontentonline1
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.uploadSchoolBulk = async (req, res) => {
  try {
    if (!req.files) {
      throw buildErrObject(400, 'CSV file is missing')
    }

    if (req.files && !req.files.doc) {
      throw buildErrObject(400, 'CSV file is missing')
    }

    let file_name = await uploadFile({
      file: req.files.doc,
      path: `${STORAGE_PATH}/uploadcsvclient`
    })

    let url = dir___2 + 'public/uploadcsvclient/' + file_name

    const jsonArray = await csv().fromFile(url)
    // fs.unlinkSync(url);
    //Validation of csv file

    // var checkCsvFile = jsonArray.find((item) => {
    //   Object.keys(item).forEach((k) => (item[k] = item[k].trim()));
    //   if (
    //     !item["Business Name"] ||
    //     !item["GST Number"] ||
    //     !item["Mobile Number"] ||
    //     !item["UDISE Code"] ||
    //     !item["Number Of Student"] ||
    //     !item["Trust Name"] ||
    //     !item["Trust First Name"] ||
    //     !item["Trust Last Name"] ||
    //     !item["Trust Email"] ||
    //     !item["Trust Phone"] ||
    //     !item["Principal First Name"] ||
    //     !item["Principal Last Name"] ||
    //     !item["Principal Email"] ||
    //     !item["Principal Phone"] ||
    //     !item["School Name"] ||
    //     !item["Coordinator’s First Name"] ||
    //     !item["Coordinator’s Last Name"] ||
    //     !item["School Coordinator Email"] ||
    //     !item["School Mobile Number"] ||
    //     !item["School PinCode"] ||
    //     !item["School Address"] ||
    //     !item["School City"] ||
    //     !item["School State"]
    //   ) {
    //     return true;
    //   } else {
    //     return false;
    //   }
    // });
    // console.log(checkCsvFile, "checkCsvFilehgkghk");
    // if (checkCsvFile) {
    //   const missingField = Object.keys(checkCsvFile).find(
    //     (key) => !checkCsvFile[key]
    //   );
    //   throw utils.buildErrObject(
    //     400,
    //     `${missingField} missing at row ${
    //       jsonArray.indexOf(checkCsvFile) + 2
    //     } from sheet`
    //   );
    // }

    var schoolCsvFile = []
    for (var i = 0; i < jsonArray.length; i++) {
      const schoolEmail = await Client.findOne({
        email: jsonArray[i]['email']
      })

      if (schoolEmail) {
        return res.status(400).json({ msg: 'Email already exist' })
      } else {
        schoolCsvFile.push({
          // formNo: Math.floor(
          //   Math.random() * Math.floor(Math.random() * Date.now())
          // ),
          // email: "school",
          firstName: jsonArray[i]['firstName'],
          lastName: jsonArray[i]['lastName'],
          address: jsonArray[i]['address'],
          address1: jsonArray[i]['address1'],
          address2: jsonArray[i]['address2'],
          postalCode: jsonArray[i]['postalCode'],
          town: jsonArray[i]['town'],
          phone: jsonArray[i]['phone'],
          email: jsonArray[i]['email'],
          user_id: jsonArray[i]['user_id']
        })
      }
    }

    const createdSchools = await Client.insertMany(schoolCsvFile)
    // for (const school of createdSchools) {
    //   const schoolInfo = setSchoolInfo(school);
    //   school.type = "school";
    //   const response = returnRegisterToken(school, schoolInfo);
    // }

    res.json({
      code: 200,
      data: createdSchools
    })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}
function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 'A' })

  return data
}

exports.uploadexcel = async (req, res) => {
  try {
    if (!req.files) {
      throw buildErrObject(400, 'CSV file is missing')
    }

    if (req.files && !req.files.doc) {
      throw buildErrObject(400, 'CSV file is missing')
    }

    let file_name = await uploadFile({
      file: req.files.doc,
      path: `${STORAGE_PATH}/uploadcsvclient`
    })

    let url = dir___2 + 'public/uploadcsvclient/' + file_name

    const jsonArray = readExcelFile(url)

    var schoolCsvFile = []
    for (var i = 0; i < jsonArray.length; i++) {
      // const schoolEmail = await getItemCustom(
      //   Client,
      //   {
      //     email: jsonArray[i]["email"],
      //   },

      // );

      // if (schoolEmail) {
      // } else {
      schoolCsvFile.push({
        // formNo: Math.floor(
        //   Math.random() * Math.floor(Math.random() * Date.now())
        // ),
        // email: "school",
        firstName: jsonArray[i]['firstName'],
        lastName: jsonArray[i]['lastName'],
        address: jsonArray[i]['address'],
        address1: jsonArray[i]['address1'],
        address2: jsonArray[i]['address2'],
        postalCode: jsonArray[i]['postalCode'],
        town: jsonArray[i]['town'],
        phone: jsonArray[i]['phone'],
        email: jsonArray[i]['A'],
        user_id: jsonArray[i]['B']
      })
    }
    const createdSchools = await Client.insertMany(schoolCsvFile)
    // for (const school of createdSchools) {
    //   const schoolInfo = setSchoolInfo(school);
    //   school.type = "school";
    //   const response = returnRegisterToken(school, schoolInfo);
    // }

    res.json({
      code: 200,
      data: createdSchools
    })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.updateNotification = async (req, res) => {
  try {
    await notifications.updateMany(
      { receiver_id: req.user._id },
      { is_seen: true }
    )

    res.status(200).json({
      code: 200,
      response: 'Updated'
    })
  } catch (error) {
    handleError(res, error)
  }
}
async function getMonthlyTotals(req) {
  const monthlyTotals = {
    month: moment.months(),
    date: Array(12).fill(0)
  }

  const invoices = await Invoice.find({})

  invoices.forEach((invoice) => {
    const monthIndex = moment(invoice.createdAt).month()
    monthlyTotals.data[monthIndex] += invoice.total
  })

  return monthlyTotals
}

exports.dashboardgraphapi = async (req, res) => {
  try {
    const data = req.query
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let obj = {
      year: { $year: '$createdAt' }
    }

    if (data.type == 'month') {
      obj.month = { $month: '$createdAt' }
      sevenDaysAgo.setMonth(sevenDaysAgo.getMonth() - 12)
    }

    if (data.type == 'quaterly') {
      obj.month = { $month: '$createdAt' }
      sevenDaysAgo.setMonth(sevenDaysAgo.getMonth() - 6)
    }

    if (data.type == 'daily') {
      obj = {
        days: { $dayOfMonth: '$createdAt' },
        month: { $month: '$createdAt' },
        year: { $year: '$createdAt' }
      }
    }
    const getcontentonline1 = await Invoice.aggregate([
      {
        $match: {
          user_id: mongoose.Types.ObjectId(req.user._id),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $addFields: {
          total: { $toDouble: '$total' } // Convert total from string to double
        }
      },
      {
        $group: {
          _id: obj,
          total_price: { $sum: '$total' }
        }
      },
      // {
      //   $lookup: {
      //     from: "contents",
      //     localField: "data.content_id",
      //     foreignField: "_id",
      //     as: "content_id",
      //   },
      // },
      {
        $sort: { createdAt: -1 } // Sort by month in ascending order (optional)
      }
    ])

    res.status(200).json({
      code: 200,
      response: {
        month: moment.months(),
        data: moment
          .months()
          .map((monthName, index) => {
            const foundItem = getcontentonline1.find(
              (item) => item._id.month === index + 1
            )
            return foundItem
              ? {
                  _id: {
                    year: foundItem._id.year,
                    month: foundItem._id.month
                  },
                  total_price: foundItem.total_price
                }
              : {
                  _id: {
                    year: moment().year(),
                    month: index + 1
                  },
                  total_price: 0
                }
          })
          .filter((item) => item.total_price !== undefined) // Remove undefined items
      }
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.dashboardgraphapibyHour = async (req, res) => {
  try {
    const data = req.query
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const obj = {
      year: { $year: '$createdAt' }
    }

    if (data.type == 'lastsevendays') {
      obj.month = { $month: '$createdAt' }
      obj.weeks = { $week: '$createdAt' }
      // sevenDaysAgo.set(sevenDaysAgo.getMonth() - 1);
      //  cond.createdAt = { $gte: sevenDaysAgo }
    }

    if (data.type == 'month') {
      obj.month = { $month: '$createdAt' }
      sevenDaysAgo.setMonth(sevenDaysAgo.getMonth() - 12)
    }

    if (data.type == 'quaterly') {
      obj.month = { $month: '$createdAt' }
      sevenDaysAgo.setMonth(sevenDaysAgo.getMonth() - 6)
    }

    if (data.type == 'daily') {
      obj.month = { $month: '$createdAt' }
      obj.days = { $dayOfMonth: '$createdAt' }
    }

    const matchCondition = {
      user_id: mongoose.Types.ObjectId(req.user._id)
    }

    if (data.start && data.end) {
      matchCondition.createdAt = {
        $gte: new Date(data.start),
        $lte: new Date(data.end)
      }
    } else {
      matchCondition.createdAt = { $gte: sevenDaysAgo }
    }

    const getcontentonline1 = await Invoice.aggregate([
      {
        $match: matchCondition
      },
      {
        $addFields: {
          total: { $toDouble: '$total' } // Convert total from string to double
        }
      },
      {
        $group: {
          // _id: { $month: "$createdAt" }, // Group by month
          _id: obj,
          total_price: { $sum: '$total' }
          // total_vat: { $sum: "$Vat" },
        }
      },
      // {
      //   $lookup: {
      //     from: "contents",
      //     localField: "data.content_id",
      //     foreignField: "_id",
      //     as: "content_id",
      //   },
      // },
      {
        $sort: { createdAt: -1 } // Sort by month in ascending order (optional)
      }
    ])
    res.status(200).json({
      code: 200,
      response: getcontentonline1
    })
  } catch (error) {
    handleError(res, error)
  }
}

const getDownloadlistofcustomer = async (data, res, model) => {
  return new Promise(async (resolve, reject) => {
    try {
      const Payment_Detail = await model.find({
        user_id: data.payment_id
      })

      const contents = await fs.readFileSync('./views/client.ejs', 'utf8')

      // const html = await ejs.render(contents, data);
      var html = await ejs.render(contents, {
        // logo: "data:image/png;base64," + base64Logo,
        order: Payment_Detail
        // moment: moment,
        // BASE_URL: process.env.PUBLIC_BUCKET_URL,
        // dollarIndianLocale: dollarIndianLocale,
      })
      /*
       * Call a  user define method to generate PDF.
       */
      const fileName = 'invoice-' + Date.now()
      const heading = 'testing'
      var options = {
        format: 'A4',
        width: '14in',
        orientation: 'landscape',
        height: '21in',
        timeout: 540000
      }

      await pdf
        .create(html, options)
        .toFile(
          'public_v1/invoice/' + fileName + '.pdf',
          async function (err, pdfV) {
            if (err) return console.log(err)

            const fullPath =
              process.env.API_URL2 + 'public_v1/invoice/' + fileName + '.pdf'

            const filename = path.basename(fullPath)
            const contentType = mime.lookup(fullPath)

            res.setHeader(
              'Content-disposition',
              'attachment; filename=' + filename
            )
            res.setHeader('Content-type', contentType)

            const filestream = await fs.createReadStream(pdfV.filename)

            filestream.on('data', () => {
              console.log('reading.....')
            })

            filestream.on('open', function () {
              console.log('Open-------------------->')

              filestream.pipe(res)
            })

            filestream.on('end', () => {
              fs.unlink(pdfV.filename, (err) => {
                if (err) throw err
                console.log('successfully deleted ', fullPath)
              })
            })
            filestream.on('error', (err) => {
              console.log(err)
            })
            filestream.on('close', () => {
              console.log('Stream closed now')
            })
            // }
          }
        )

      resolve(true)
    } catch (error) {
      reject(buildErrObject(422, error.message))
    }
  })
}

exports.downloadsclients = async (req, res) => {
  try {
    let response = await getDownloadlistofcustomer(req.query, res, Client)
    // res.status(200).json({
    //   code: 200,
    //   staus: response,
    // });
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateClient = async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: id }

    const user = await Client.findOne(filter)
    let update = req.body

    const data = await Client.findOneAndUpdate(filter, update, {
      new: true
    })

    return res.status(200).json({
      code: 200,
      data
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.addTodo = async (req, res) => {
  try {
    const data = req.body
    data.user = req.user._id
    const todo = await TodoModel.create(data)
    return res.status(201).json({
      code: 201,
      data: todo
    })
  } catch (error) {
    handleError(res, error)
  }
}
exports.getTodos = async (req, res) => {
  try {
    const todo = await TodoModel.find({ user: req.user._id }).sort({
      createdAt: -1
    })
    return res.status(200).json({
      code: 200,
      data: todo
    })
  } catch (error) {
    handleError(res, error)
  }
}
exports.deleteTodo = async (req, res) => {
  try {
    await TodoModel.findByIdAndDelete(req.params.id)
    return res.status(200).json({ code: 200, data: null })
  } catch (error) {
    handleError(res, error)
  }
}
exports.updateStatus = async (req, res) => {
  try {
    const todo = await TodoModel.findOne({ _id: req.params.id })
    const filter = todo.status === 'completed' ? 'pending' : 'completed'
    const data = await TodoModel.findOneAndUpdate(
      { _id: req.params.id },
      { status: filter },
      { new: true }
    )
    return res
      .status(200)
      .json({ code: 200, message: 'status has been updated', data: data })
  } catch (error) {
    handleError(res, error)
  }
}
exports.getClientsCars = async (req, res) => {
  try {
    const clientsData = await Quote.find(
      { clientId: req.params.id, type_of_car: { $exists: true } },
      { type_of_car: 1, model: 1, _id: 0 }
    ).populate({
      path: 'type_of_car',
      select: '_id main_title'
    })
    const filterNull = clientsData.filter((item) => item.type_of_car != null)
    const uniqueSet = new Set(filterNull.map(JSON.stringify))

    const temp = Array.from(uniqueSet, JSON.parse)
    const result = temp.map((item) => {
      return {
        type_of_car_id: item?.type_of_car?._id,
        main_title: item?.type_of_car?.main_title,
        model: item?.model
      }
    })
    return res.json({
      code: 200,
      message: 'sucessfully fetched data',
      data: result
    })
  } catch (error) {
    return res.status(200).send({
      code: 500,
      message: 'Internal Server Error',
      error: error.message
    })
  }
}
exports.getUpcomingAppointments = async (req, res) => {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const data = await Calendar.find({
      user_id: req.user._id,
      date: { $gt: today }
    }).populate({
      path: 'client_id',
      select: '_id firstName lastName'
    })

    return res.status(200).json({
      code: 200,
      message: 'Successfully fetched data',
      data: data
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error',
      error: error.message
    })
  }
}
exports.getTopClients = async (req, res) => {
  try {
    const year = req.query.year
    const filter = { user_id: req.user._id }

    if (year) {
      filter.createdAt = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }
    const clients = await Invoice.find(filter)
    const totalAmountByClient = {}

    const clientDetailsPromises = []

    clients.forEach((invoice) => {
      const clientId = invoice.clientId
      const totalAmount = invoice.parts.reduce(
        (acc, part) => acc + part.price * part.quantity,
        0
      )
      const paidAmount = invoice.paidAmount || 0

      if (clientId in totalAmountByClient) {
        totalAmountByClient[clientId].total += totalAmount
        totalAmountByClient[clientId].paid += paidAmount
      } else {
        totalAmountByClient[clientId] = {
          total: totalAmount,
          paid: paidAmount
        }
        clientDetailsPromises.push(Client.findOne({ _id: clientId }))
      }
    })

    const clientDetails = await Promise.all(clientDetailsPromises)

    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.limit) || 10

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    const paginatedResult = clientDetails
      .filter((client) => client !== null)
      .slice(startIndex, endIndex)
      .map((client, index) => {
        const clientId = client._id.toString()
        const totalAmount = totalAmountByClient[clientId].total
        const paidAmount = totalAmountByClient[clientId].paid
        const paidPercentage = (paidAmount / totalAmount) * 100

        return {
          clientDetails: client,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          paidPercentage: paidPercentage.toFixed(2)
        }
      })

    return res.status(200).send({
      code: 200,
      message: 'Successfully fetched data',
      data: {
        pagination: {
          page: page,
          pageSize: pageSize,
          totalItems: clientDetails.length,
          totalPages: Math.ceil(clientDetails.length / pageSize)
        },
        results: paginatedResult
      }
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error',
      error: error.message
    })
  }
}
exports.viewQuotation = async (req, res) => {
  try {
    const quote = await FreeQuote.findOne({ _id: req.params.id })
      .populate({
        path: 'technician.techniciansId',
        select: '_id first_name last_name'
      })
      .populate('car')

    return res.status(200).json({
      code: 200,
      message: 'Successfully fetched data',
      data: quote
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error',
      error: error.message
    })
  }
}

exports.createduplicate = async (req, res) => {
  try {
    const data = req.body
    // data.user = req.user._id

    let todo
    if (data.type == 'free') {
      const freeval = await FreeQuote.findOne({ _id: data.id }).select('-_id')
      // todo = await FreeQuote.create(freeval)
      const todo = new FreeQuote(freeval.toObject())
      await todo.save()
    } else {
      const findquote = await Quote.findOne({ _id: data.id }).select('-_id')
      // todo = await Quote.create(findquote)
      const todo = new Quote(findquote.toObject())
      await todo.save()
    }
    return res.status(201).json({
      code: 201,
      data: todo
    })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getInvoiceDataByType = async (req, res) => {
  try {
    if (req.query.year && req.query.month == 0) {
      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            $expr: {
              $or: [
                { $eq: [{ $year: '$createdAt' }, parseInt(req.query.year)] },
                { $eq: [{ $month: '$createdAt' }, parseInt(req.query.month)] }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            monthIndex: '$_id.month',
            count: 1
          }
        }
      ])
      const data = {
        months: [
          'Jan',
          'Feb',
          'March',
          'April',
          'May',
          'June',
          'July',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec'
        ],
        data: Array(12).fill(0)
      }

      invoices.forEach((invoice) => {
        data.data[invoice.monthIndex - 1] = invoice.count
      })

      return res.send({
        message: 'data fetched successfully',
        data: data
      })
    } else if (req.query.year && req.query.month) {
      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            $expr: {
              $and: [
                { $eq: [{ $year: '$createdAt' }, parseInt(req.query.year)] },
                { $eq: [{ $month: '$createdAt' }, parseInt(req.query.month)] }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              week: {
                $switch: {
                  branches: [
                    {
                      case: { $lte: [{ $dayOfMonth: '$createdAt' }, 7] },
                      then: 1
                    },
                    {
                      case: { $lte: [{ $dayOfMonth: '$createdAt' }, 14] },
                      then: 2
                    },
                    {
                      case: { $lte: [{ $dayOfMonth: '$createdAt' }, 21] },
                      then: 3
                    },
                    {
                      case: { $lte: [{ $dayOfMonth: '$createdAt' }, 31] },
                      then: 4
                    }
                  ],
                  default: 0
                }
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            week: '$_id.week',
            count: 1
          }
        },
        {
          $sort: {
            week: 1
          }
        }
      ])

      const data = {
        weeks: ['1st Week', '2nd Week', '3rd Week', '4th Week'],
        data: Array(4).fill(0)
      }

      invoices.forEach((invoice) => {
        if (invoice.week !== 0) {
          data.data[invoice.week - 1] = invoice.count
        }
      })

      return res.status(200).json({
        data: data,
        message: 'data fetched successfully'
      })
    } else {
    }
  } catch (err) {
    return res.status(500).send({
      code: 500,
      error: err.message,
      message: 'Internal Server Error'
    })
  }
}
exports.getInvoiceTotalByType = async (req, res) => {
  try {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    if (currentYear == req.query.year) {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1 // Adding 1 because months are zero-indexed

      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            $expr: {
              $eq: [{ $year: '$createdAt' }, currentYear]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: { $toDouble: '$total' } }
          }
        },
        {
          $project: {
            _id: 0,
            monthIndex: '$_id.month',
            total: 1
          }
        }
      ])

      const monthsArray = Array.from({ length: currentMonth }, (_, i) =>
        currentDate.toLocaleString('en-US', {
          month: 'long'
        })
      )

      const data = {
        months: monthsArray,
        data: Array(currentMonth).fill(0)
      }

      invoices.forEach((invoice) => {
        data.data[invoice.monthIndex - 1] = invoice.total
      })

      return res.send({
        message: 'data fetched successfully',
        data: data
      })
    } else {
      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            $expr: {
              $or: [
                { $eq: [{ $year: '$createdAt' }, parseInt(req.query.year)] },
                { $eq: [{ $month: '$createdAt' }, parseInt(req.query.month)] }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: { $toDouble: '$total' } }
          }
        },
        {
          $project: {
            _id: 0,
            monthIndex: '$_id.month',
            total: 1
          }
        }
      ])

      const data = {
        months: [
          'January',
          'February',
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
        ],
        data: Array(12).fill(0)
      }

      invoices.forEach((invoice) => {
        data.data[invoice.monthIndex - 1] = invoice.total
      })

      return res.send({
        message: 'data fetched successfully',
        data: data
      })
    }
  } catch (err) {
    return res.status(500).send({
      code: 500,
      error: err.message,
      message: 'Internal Server Error'
    })
  }
}
exports.getInvoiceUnpaid = async (req, res) => {
  try {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    if (currentYear == req.query.year) {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            status: 'unpaid',
            $expr: {
              $eq: [{ $year: '$createdAt' }, currentYear]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            sum: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            monthIndex: '$_id.month',
            sum: 1
          }
        }
      ])

      const monthsArray = Array.from({ length: currentMonth }, (_, i) =>
        currentDate.toLocaleString('en-US', {
          month: 'short'
        })
      )

      const data = {
        months: monthsArray,
        data: Array(currentMonth).fill(0)
      }

      invoices.forEach((invoice) => {
        data.data[invoice.monthIndex - 1] = invoice.sum
      })

      return res.send({
        message: 'data fetched successfully',
        data: data
      })
    } else {
      const invoices = await Invoice.aggregate([
        {
          $match: {
            user_id: req.user._id,
            createdAt: { $exists: true },
            status: 'unpaid',
            $expr: {
              $or: [
                {
                  $eq: [{ $year: '$createdAt' }, parseInt(req.query.year)]
                },
                {
                  $eq: [{ $month: '$createdAt' }, parseInt(req.query.month)]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            sum: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            monthIndex: '$_id.month',
            sum: 1
          }
        }
      ])

      const data = {
        months: [
          'Jan',
          'Feb',
          'March',
          'April',
          'May',
          'June',
          'July',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec'
        ],
        data: Array(12).fill(0)
      }

      invoices.forEach((invoice) => {
        data.data[invoice.monthIndex - 1] = invoice.sum
      })

      return res.send({
        message: 'data fetched successfully',
        data: data
      })
    }
  } catch (err) {
    return res.status(500).send({
      code: 500,
      error: err.message,
      message: 'Internal Server Error'
    })
  }
}

// exports.recordpayment = async (req, res) => {
//   try {
//     const invoice = await Invoice.findOne({ _id: req.params.id })

//     if (!invoice) {
//       return res.status(404).send({ message: 'Not Found', code: 404 })
//     }

//     if (invoice.status === 'unpaid') {
//       if (
//         req.body.payment_method === 'cash' ||
//         req.body.payment_method === 'cheque' ||
//         req.body.payment_method === 'virement'
//       ) {
//         const newBalance = Number(invoice.total) - Number(req.body.paid_amount)
//         const filter =
//           Math.floor(req.body.paid_amount) === Math.floor(Number(invoice.total))
//             ? {
//                 status: 'fully_paid',
//                 balance: 0,
//                 paid_amount: req.body.paid_amount
//               }
//             : {
//                 status: 'partially_paid',
//                 balance: newBalance,
//                 paid_amount: req.body.paid_amount
//               }

//         await Invoice.findOneAndUpdate({ _id: req.params.id }, { $set: filter })
//       }
//     } else if (invoice.status === 'partially_paid') {
//       if (
//         req.body.payment_method === 'cash' ||
//         req.body.payment_method === 'cheque' ||
//         req.body.payment_method === 'virement'
//       ) {
//         const newBalance =
//           Number(invoice.balance) - Number(req.body.paid_amount)
//         const newPaidAmount =
//           Number(invoice.paid_amount) + Number(req.body.paid_amount)
//         const filter =
//           Math.floor(req.body.paid_amount) === Math.floor(Number(invoice.total))
//             ? {
//                 status: 'fully_paid',
//                 balance: 0,
//                 paid_amount: newPaidAmount
//               }
//             : {
//                 status: 'partially_paid',
//                 balance: newBalance,
//                 paid_amount: newPaidAmount
//               }

//         await Invoice.findOneAndUpdate({ _id: req.params.id }, filter)
//       }
//     }

//     const updateFields = {}

//     if (req.body.comment) {
//       updateFields.comment = req.body.comment
//     }

//     if (req.body.recieved_from) {
//       updateFields.recieved_from = req.body.recieved_from
//     }

//     if (req.body.transaction_id) {
//       updateFields.transaction_id = req.body.transaction_id
//     }
//     const update_invoice = await Invoice.findByIdAndUpdate(
//       req.params.id,
//       updateFields,
//       { new: true }
//     )
//     return res.status(200).json({
//       code: 200,
//       message: 'Recorded successfully',
//       data: update_invoice
//     })
//   } catch (error) {
//     handleError(res, error)
//   }
// }

exports.recordpayment = async (req, res) => {
  try {
    const frontImageFile = req.files?.frontImage || null;
    const backImageFile = req.files?.backImage || null;
    const invoice = await Invoice.findOne({ _id: req.params.id });

    if (!invoice) {
      return res.status(404).send({ message: 'Invoice not found', code: 404 });
    }

    let frontImagePath = invoice.frontImage || '';
    let backImagePath = invoice.backImage || '';

    if (frontImageFile) {
      console.log('Front Image file detected:', frontImageFile);

      const { name, mimetype, data } = frontImageFile;
      const fileContent = Buffer.from(data, 'binary');

      const fileExtension = name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const fileKey = `images/${fileName}`;

      const putParams = {
        Bucket: 'eurobase-media',
        Key: fileKey,
        Body: fileContent,
        ACL: 'public-read',
        ContentType: mimetype
      };

      await s3.putObject(putParams).promise();
      frontImagePath = `${process.env.CONTABO_END_POINT_IMAGE}/${putParams.Key}`;
      console.log('Front Image uploaded successfully:', frontImagePath);
    }

    if (backImageFile) {
      console.log('Back Image file detected:', backImageFile);

      const { name, mimetype, data } = backImageFile;
      const fileContent = Buffer.from(data, 'binary');

      const fileExtension = name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const fileKey = `images/${fileName}`;

      const putParams = {
        Bucket: 'eurobase-media',
        Key: fileKey,
        Body: fileContent,
        ACL: 'public-read',
        ContentType: mimetype
      };

      await s3.putObject(putParams).promise();

      backImagePath = `${process.env.CONTABO_END_POINT_IMAGE}/${putParams.Key}`;
      console.log('Back Image uploaded successfully:', backImagePath);
    }

    if (invoice.status === 'unpaid') {
      if (
        req.body.payment_method === 'cash' ||
        req.body.payment_method === 'cheque' ||
        req.body.payment_method === 'virement'
      ) {
        const newBalance = Number(invoice.total) - Number(req.body.paid_amount);
        const filter =
          Math.floor(req.body.paid_amount) === Math.floor(Number(invoice.total))
            ? {
                status: 'fully_paid',
                balance: 0,
                paid_amount: req.body.paid_amount
              }
            : {
                status: 'partially_paid',
                balance: newBalance,
                paid_amount: req.body.paid_amount
              };

        await Invoice.findOneAndUpdate({ _id: req.params.id }, { $set: filter });
      }
    } else if (invoice.status === 'partially_paid') {
      if (
        req.body.payment_method === 'cash' ||
        req.body.payment_method === 'cheque' ||
        req.body.payment_method === 'virement'
      ) {
        const newBalance = Number(invoice.balance) - Number(req.body.paid_amount);
        const newPaidAmount = Number(invoice.paid_amount) + Number(req.body.paid_amount);
        const filter =
          Math.floor(req.body.paid_amount) === Math.floor(Number(invoice.total))
            ? {
                status: 'fully_paid',
                balance: 0,
                paid_amount: newPaidAmount
              }
            : {
                status: 'partially_paid',
                balance: newBalance,
                paid_amount: newPaidAmount
              };

        await Invoice.findOneAndUpdate({ _id: req.params.id }, filter);
      }
    }

    const updateFields = {};

    if (req.body.comment) {
      updateFields.comment = req.body.comment;
    }

    if (req.body.recieved_from) {
      updateFields.recieved_from = req.body.recieved_from;
    }

    if (req.body.transaction_id) {
      updateFields.transaction_id = req.body.transaction_id;
    }

    if (frontImagePath) {
      updateFields.frontImage = frontImagePath;
    }

    if (backImagePath) {
      updateFields.backImage = backImagePath;
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    let responseData = {
      code: 200,
      message: 'Recorded successfully',
      data: updatedInvoice
    };

    if (frontImagePath && backImagePath) {
      responseData.message = 'Recorded successfully & images uploaded';
    } else if (frontImagePath || backImagePath) {
      responseData.message = 'Recorded successfully & image uploaded';
    } else {
      responseData.message = 'Recorded successfully';
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error(JSON.stringify(error));
    return res.status(500).json({ code: 500, message: 'Internal Server Error' });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    const search = (req.query.search || '').toLowerCase()
    const page = parseInt(req.query.page) || 1
    const pageSize = req.query.limit ? parseInt(req.query.limit) : 10

    const invoices = await Invoice.find({ user_id: req.user._id })
      .populate('clientId')
      .populate({
        path: 'quotation_id',
        populate: { path: 'type_of_car' }
      })
      .lean()

    const freeInvoices = await freeInvoice
      .find({ user_id: req.user._id })
      .populate('clientId')
      .populate({
        path: 'quotation_id',
        populate: { path: 'car' }
      })
      .lean()

    const filteredInvoices = invoices.filter((item) => {
      const clientFirstName = (item?.clientId?.firstName || '').toLowerCase()
      const clientLastName = (item?.clientId?.lastName || '').toLowerCase()
      const quotationModel = (item?.quotation_id?.model || '').toLowerCase()
      const carMainTitle = (
        item?.quotation_id?.type_of_car?.main_title || ''
      ).toLowerCase()

      return (
        clientFirstName.includes(search) ||
        clientLastName.includes(search) ||
        quotationModel.includes(search) ||
        carMainTitle.includes(search)
      )
    })

    const filteredFreeInvoices = freeInvoices.filter((item) => {
      const clientFirstName = (item?.clientId?.firstName || '').toLowerCase()
      const clientLastName = (item?.clientId?.lastName || '').toLowerCase()
      const carMainTitle = (
        item?.quotation_id?.car?.main_title || ''
      ).toLowerCase()
      const carModel = (item?.quotation_id?.carModel || '').toLowerCase()

      return (
        clientFirstName.includes(search) ||
        clientLastName.includes(search) ||
        carMainTitle.includes(search) ||
        carModel.includes(search)
      )
    })
    const validInvoices = filteredInvoices.filter((invoice) => {
      return invoice.clientId && invoice.quotation_id
    })
    const validFreeInvoices = filteredFreeInvoices.filter((invoice) => {
      return invoice.clientId && invoice.quotation_id
    })
    const allInvoices = validInvoices
      .map((invoice) => ({ ...invoice, type: 'Invoice' }))
      .concat(
        validFreeInvoices.map((freeInvoice) => ({
          ...freeInvoice,
          type: 'Free Invoice'
        }))
      )
      .sort((a, b) => b.createdAt - a.createdAt)

    const totalPages = Math.ceil(allInvoices.length / pageSize)
    const paginatedInvoices = allInvoices.slice(
      (page - 1) * pageSize,
      page * pageSize
    )

    return res.status(200).send({
      code: 200,
      invoices: paginatedInvoices,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: allInvoices.length
      }
    })
  } catch (error) {
    return res.status(500).json({
      code: 500,
      error: error.message,
      message: 'Internal Server Error'
    })
  }
}
exports.getFreeInvoices = async (req, res) => {
  const search = (req.query.search || '').toLowerCase()
  const pageSize = req.query.limit ? parseInt(req.query.limit) : 10
  const page = req.query.page ? parseInt(req.query.page) : 1

  const filterInvoices = (invoices) =>
    invoices.filter(
      (item) =>
        item?.clientId?.firstName?.toLowerCase().includes(search) ||
        item?.clientId?.lastName?.toLowerCase().includes(search) ||
        item?.quotation_id?.carModel?.toLowerCase().includes(search) ||
        item?.quotation_id?.car?.main_title.toLowerCase().includes(search)
    )

  try {
    const allInvoices = await freeInvoice
      .find({ user_id: mongoose.Types.ObjectId(req.user._id) })
      .populate('clientId')
      .populate({
        path: 'quotation_id',
        populate: { path: 'car' }
      })
      .sort({ createdAt: -1 })

    const validInvoices = allInvoices.filter((invoice) => {
      return invoice.clientId && invoice.quotation_id
    })

    const freeInvoicesCount = validInvoices.length

    const filteredInvoices = filterInvoices(validInvoices)

    const totalPages = Math.ceil(freeInvoicesCount / pageSize)

    const paginatedInvoices = filteredInvoices
      .slice((page - 1) * pageSize, page * pageSize)
      .map((invoice) => ({ ...invoice.toObject(), type: 'Invoice' }))

    return res.status(200).send({
      code: 200,
      data: {
        invoices: paginatedInvoices,
        pagination: {
          totalItems: filteredInvoices.length,
          totalPages: totalPages,
          currentPage: page
        }
      }
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      code: 500,
      error: error.message,
      message: 'Internal Server Error'
    })
  }
}

exports.getOutstandingBalances = async (req, res) => {
  try {
    const invoices = await Invoice.aggregate([
      {
        $match: {
          user_id: req.user._id
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      },
      {
        $project: {
          _id: 1,
          total: { $ifNull: ['$total', 0] },
          clientId: {
            _id: '$client._id',
            firstName: '$client.firstName',
            lastName: '$client.lastName'
          },
          balance: {
            $cond: {
              if: {
                $or: [
                  {
                    $and: [
                      { $eq: ['$balance', null] },
                      { $eq: ['$total', null] }
                    ]
                  },
                  { $lte: ['$balance', 0] }
                ]
              },
              then: 0,
              else: {
                $cond: {
                  if: { $gt: ['$balance', 0] },
                  then: '$balance',
                  else: '$total'
                }
              }
            }
          }
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 10
      }
    ])
    const sumTotal = invoices?.reduce((acc, item) => {
      return acc + Number(item?.total)
    }, 0)
    const ob = invoices?.reduce((acc, item) => {
      return acc + Number(item?.balance)
    }, 0)
    const response = {
      data: invoices,
      sumTotal: sumTotal,
      totalOutStandingBalnce: ob
    }

    return res.status(200).json({
      code: 200,
      data: response
    })
  } catch (error) {
    return res.status(500).json({
      code: 500,
      error: error.message,
      message: 'Internal Server Error'
    })
  }
}
exports.sendInvoiceToUser = async (req, res) => {
  try {
    const locale = req.getLocale()
    const invoice = await Invoice.findOne({
      _id: req.body.invoice_id
    }).populate('clientId')

    req.body.first_name = invoice?.clientId.firstName
    req.body.last_name = invoice?.clientId.lastName
    req.body.invoice_link =
      process.env.API_URL3 + 'users/invoice/download/' + req.body.invoice_id
    for (const email of req.body.emails) {
      emailer.sendEmailInvoice(locale, req.body, email, 'sendInvoice')
    }
    const update_invoice = await Invoice.update(
      { _id: req.body.invoice_id },
      { $set: { invoiceSent: true } },
      { new: true }
    )
    return res.status(200).json({
      code: 200,
      message: 'email sent successfully',
      data: update_invoice
    })
  } catch (error) {
    return res.status(500).json({
      code: 500,
      error: error.message,
      message: 'Internal Server Error'
    })
  }
}
exports.disableEnabledSubUser = async (req, res) => {
  try {
    const user = await Sub_user.findOne({ _id: req.params.id })
    if (!user) {
      return res.status(404).send({
        message: 'sub user not found',
        code: 404
      })
    }

    const filter = user.is_active === 'active' ? 'inactive' : 'active'
    const subuser = await Sub_user.findOneAndUpdate(
      { _id: req.params.id },
      { is_active: filter },
      { new: true }
    )
    return res.status(200).json({
      code: 200,
      message: 'updated successfully',
      data: subuser
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error',
      error: error.message
    })
  }
}
exports.checkEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    const subuser = await Sub_user.findOne({ email: req.body.email })
    if (user || subuser) {
      return res
        .status(200)
        .send({ status: false, code: 200, message: 'email already in use' })
    } else {
      return res
        .status(200)
        .send({ status: true, code: 200, message: 'Available' })
    }
  } catch (error) {
    return res.status(500).send({
      code: 500
    })
  }
}
exports.verifyPassword = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id }, { password: 1 })
    if (!user) {
      return res.status(404).send({ code: 404, message: 'not found' })
    }
    const isPasswordMatch = await auth.checkPassword(req.body.password, user)
    console.log(isPasswordMatch)
    if (!isPasswordMatch) {
      return res.status(404).send({ code: 404, message: 'invalid password' })
    }
    return res.send({
      code: 200,
      message: 'password matched'
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({ code: 500, message: 'internal error' })
  }
}
exports.deleteSecondaryEmail = async (req, res) => {
  try {
    const userId = req.user._id
    const { email } = req.body

    const user = await User.findOneAndUpdate(
      { _id: userId, 'secondary_emails.email': email },
      {
        $pull: {
          // Use $pull to remove the specified element from the array
          secondary_emails: { email: email }
        }
      },
      { new: true }
    )

    if (!user) {
      return res.status(400).json({ code: 400, message: 'Email not found' })
    }

    res.status(200).json({
      status: true,
      code: 200,
      message: 'Secondary email deleted successfully',
      user: user
    })
  } catch (error) {
    console.error('Error deleting secondary email:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.createAppCusomer = async (req, res) => {
  try {
    const customer = await stripe.customers.create({
      email: req.body.email,
      source: req.body.token
    })

    res.json({ customerId: customer.id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.chargePayment = async (req, res) => {
  try {
    const { email, token, planId } = req.body
    const plan = await SubscriptionModel.findById(planId)

    const customer = await stripe.customers.create({
      email,
      source: token
    })
    await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          stripeCustomerId: customer.id
        }
      }
    )
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price,
      currency: 'EUR',
      customer: customer.id,
      confirm: true,
      return_url: process.env.Website_link
    })

    return res.send({ code: 200, clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.getCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const stripeCustomerId = user?.stripeCustomerId
    if (!stripeCustomerId) {
      return
    }
    stripe.paymentMethods.list(
      {
        customer: stripeCustomerId,
        type: 'card'
      },
      (err, paymentMethods) => {
        if (err) {
          console.error('Error retrieving cards:', err.message)
          return
        }

        return res.send({ code: 200, data: paymentMethods })
      }
    )
  } catch (error) {
    return res.status(500).json({ code: 500, error: 'Internal Server Error' })
  }
}
exports.removeCard = async (req, res) => {
  const cardId = req.params.id

  try {
    const detachingCard = await stripe.paymentMethods.detach(cardId)
    if (detachingCard.id) {
      res.status(200).json({ success: true })
    } else {
      res.status(500).json({ success: false, error: 'Failed to remove card' })
    }
  } catch (error) {
    console.error('Error removing card:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
}
exports.addCard = async (req, res) => {
  const { cardToken } = req.body
  const user = await User.findById(req.user._id)
  let customerId = user?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.body.email,
      source: cardToken
    })
    customerId = customer.id
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: { stripeCustomerId: customerId }
      },
      { new: true }
    )
  }

  try {
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: cardToken
      }
    })
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId
    })

    res.status(200).json({ success: true, message: 'Card added successfully' })
  } catch (error) {
    console.error('Error adding card:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
}
exports.processPayment = async (req, res) => {
  const { cardId } = req.body
  //const plan = await SubscriptionModel.findById(planId);
  const customerId = req.user.stripeCustomerId
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customerId,
      payment_method: cardId,
      amount: 100,
      currency: 'eur',
      confirm: true,
      return_url: process.env.Website_link
    })

    res.json({ success: true, message: 'Payment succeeded', paymentIntent })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: 'Payment failed' })
  }
}
// exports.trackPayment = async (request, response) => {
//   try {
//     const sig = request.headers["stripe-signature"];
//     const rawBody = request.rawBody; // Make sure rawBody is correctly set by your middleware

//     try {
//       event = stripe.webhooks.constructEvent(
//         rawBody,
//         sig,
//         process.env.endpointSecret
//       );
//     } catch (err) {
//       response.status(400).send(`Webhook Error: ${err.message}`);
//       return;
//     }

//     switch (event.type) {
//       case 'checkout.session.completed':
//         const checkoutSessionCompleted = event.data.object;
//         // Handle checkout.session.completed event
//         break;
//       case 'payment_intent.payment_failed':
//         const paymentIntentPaymentFailed = event.data.object;
//         // Handle payment_intent.payment_failed event
//         break;
//       case 'payment_intent.succeeded':
//         const paymentIntentSucceeded = event.data.object;
//         console.log(paymentIntentSucceeded);
//         // Handle payment_intent.succeeded event
//         break;
//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }

//     response.send();
//   } catch (err) {
//     response.status(500).json({ code: 500, message: err.message });
//   }
// };
exports.confirm_Payment = async (req, res) => {
  try {
    const { planId, email, transaction_id } = req.body

    const user = await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          subscription_plan: planId,
          payment_status: true
        }
      }
    )
    let payload = {
      user_id: user._id,
      invoiceNumber: transaction_id,
      paid_amount: planId?.price,
      status: 'fully_paid',
      payment_date: new Date(),
      currency: 'EUR',
      transaction_id: transaction_id
    }
    const plans = await Subscription.findById(planId)
    await AppInvoiceModel.create(payload)
    const description = `${user.first_name} ${user.last_name} has purchased the ${plans?.plan_name} plan `
    const admin = await Admin.find()
    let notificationObj = {
      sender_id: user._id.toString(),
      receiver_id: admin[0]._id.toString(),
      notification_type: 'Subscription Plan',
      type: 'Subscription Plan',
      title: 'New User Subscription',
      create: true,
      create_admin: true,
      description: description
    }
    await this._sendNotification(notificationObj)
    return res.json({ code: 200, message: 'Payment Successfull' })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.confirm_appointment = async (req, res) => {
  try {
    const data = await Calendar.findByIdAndUpdate(
      req.params.id,
      { schedule_status: 'confirmed' },
      { new: true }
    )
    const client = await Client.findById(data.client_id)
    const date = data.date
    const formattedDate = new Date(date)
    const options = { day: 'numeric', month: 'long', year: 'numeric' }
    const dateFormatter = new Intl.DateTimeFormat('en-US', options)
    const formattedDateString = dateFormatter.format(formattedDate)
    let confirmedNotificationObj = {
      receiver_id: data.user_id.toString(),
      type: 'Appointment',
      title: 'Confirmed Appointment',
      create_admin: true,
      description: `Your appointment with ${client.firstName} ${client.lastName} has been confirmed on ${formattedDateString}`
    }
    await this._sendNotification(confirmedNotificationObj)
    return res
      .status(200)
      .json({ code: 200, message: 'Appointment has been confirmed' })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.reschedule_appointment = async (req, res) => {
  try {
    const updatedCalendar = await Calendar.findByIdAndUpdate(
      req.params.id,
      { schedule_status: 'reschedule' },
      { new: true }
    )

    const { user_id, date, client_id } = updatedCalendar
    const client = await Client.findById(client_id)
    const formattedDate = new Date(date)
    const options = { day: 'numeric', month: 'long', year: 'numeric' }
    const dateFormatter = new Intl.DateTimeFormat('en-US', options)
    const formattedDateString = dateFormatter.format(formattedDate)

    const confirmedNotificationObj = {
      receiver_id: user_id.toString(),
      type: 'Appointment',
      title: 'Reschedule Appointment',
      create_admin: true,
      description: `Your appointment with ${client.firstName} ${client.lastName} has been rescheduled on ${formattedDateString}`
    }

    await this._sendNotification(confirmedNotificationObj)

    return res
      .status(200)
      .json({ code: 200, message: 'Appointment has been rescheduled' })
  } catch (error) {
    console.log(error)
    console.log(error.message)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
exports.getCustomerList = async (req, res) => {
  try {
    const usersList = await Client.find({
      user_id: req.params.id
    })

    const contents = fs.readFileSync('./views/en/customerList.ejs', 'utf8')
    var html = ejs.render(contents, { usersList })

    const fileName = 'customers' + Date.now()
    var options = {
      format: 'A4',
      width: '14in',
      orientation: 'landscape',
      height: '21in',
      timeout: 540000
    }
    pdf
      .create(html, options)
      .toFile(
        'public_v1/customersList/' + fileName + '.pdf',
        async function (err, pdfV) {
          if (err) {
            console.log(err)
            return res.status(500).send('Error generating PDF')
          }

          const fullPath =
            process.env.API_URL2 +
            'public_v1/customersList/' +
            fileName +
            '.pdf'

          const filename = path.basename(fullPath)
          const contentType = mime.lookup(fullPath)

          res.setHeader(
            'Content-disposition',
            'attachment; filename=' + filename
          )
          res.setHeader('Content-type', contentType)

          const filestream = fs.createReadStream(pdfV.filename)

          filestream.on('data', () => {
            console.log('reading.....')
          })

          filestream.on('open', function () {
            console.log('Open-------------------->')
            filestream.pipe(res)
          })

          filestream.on('end', () => {
            fs.unlink(pdfV.filename, (err) => {
              if (err) throw err
              console.log('successfully deleted ', fullPath)
            })
          })

          filestream.on('error', (err) => {
            console.log(err)
            return res.status(500).send('Error reading PDF')
          })

          filestream.on('close', () => {
            console.log('Stream closed now')
          })
        }
      )
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'internal server error'
    })
  }
}
exports.getCustomerListExcel = async (req, res) => {
  try {
    const usersList = await Client.find({
      user_id: req.params.id
    })

    const wsData = [
      [
        'S.no',
        'First Name',
        'Last Name',
        'Email',
        'Phone Number',
        'Address',
        'Address 1',
        'Address 2',
        'Town',
        'Postal Code',
        'Account Number'
      ],
      ...usersList.map((user, index) => [
        index + 1,
        user.firstName,
        user.lastName,
        user.email,
        user.phoneNumber,
        user.address,
        user.address1,
        user.address2,
        user.town,
        user.postalCode,
        user.accountNumber
      ])
    ]

    const ws = xlsx.utils.aoa_to_sheet(wsData)

    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Customers')

    const fileName = 'customers' + Date.now()
    const fullPath = 'public_v1/customersList/' + fileName + '.xlsx'

    xlsx.writeFile(wb, fullPath)

    const filename = path.basename(fullPath)
    const contentType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    res.setHeader('Content-disposition', 'attachment; filename=' + filename)
    res.setHeader('Content-type', contentType)

    const filestream = fs.createReadStream(fullPath)

    filestream.on('open', function () {
      filestream.pipe(res)
    })

    filestream.on('end', () => {
      fs.unlink(fullPath, (err) => {
        if (err) throw err
        console.log('successfully deleted ', fullPath)
      })
    })

    filestream.on('error', (err) => {
      console.log(err)
      return res.status(500).send('Error reading Excel file')
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error'
    })
  }
}
exports.getCustomerListCSV = async (req, res) => {
  try {
    const usersList = await Client.find({
      user_id: req.params.id
    })

    const csvData = [
      [
        'S.no',
        'First Name',
        'Last Name',
        'Email',
        'Phone Number',
        'Address',
        'Address 1',
        'Address 2',
        'Town',
        'Postal Code',
        'Account Number'
      ],
      ...usersList.map((user, index) => [
        index + 1,
        user.firstName,
        user.lastName,
        user.email,
        user.phoneNumber,
        user.address,
        user.address1,
        user.address2,
        user.town,
        user.postalCode,
        user.accountNumber
      ])
    ]

    const fileName = 'customers' + Date.now() + '.csv'
    const fullPath = path.join('public_v1/customersList/', fileName)

    const csvStream = fastCsv.format({ headers: true })
    const writableStream = fs.createWriteStream(fullPath)

    csvStream.pipe(writableStream)

    csvData.forEach((row) => {
      csvStream.write(row)
    })

    csvStream.end()

    writableStream.on('finish', () => {
      const filename = path.basename(fullPath)
      const contentType = 'text/csv'

      res.setHeader('Content-disposition', 'attachment; filename=' + filename)
      res.setHeader('Content-type', contentType)

      const filestream = fs.createReadStream(fullPath)

      filestream.on('open', function () {
        filestream.pipe(res)
      })

      filestream.on('end', () => {
        fs.unlink(fullPath, (err) => {
          if (err) throw err
          console.log('successfully deleted ', fullPath)
        })
      })

      filestream.on('error', (err) => {
        console.log(err)
        return res.status(500).send('Error reading CSV file')
      })
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error'
    })
  }
}
exports.getRepiarList = async (req, res) => {
  try {
    const { file, client, start_date, end_date } = req.query
    const { id } = req.params
    const filters = Object.assign(
      { user_id: id, draft: false },
      client && { client_id: client },
      start_date && {
        date: {
          $gte: new Date(
            start_date.includes('Z')
              ? start_date
              : new Date(start_date).toISOString()
          )
        }
      },
      end_date && {
        date: {
          $lte: new Date(
            end_date.includes('Z') ? end_date : new Date(end_date).toISOString()
          )
        }
      }
    )
    const usersList = await Quote.find(filters)
      .populate('client_id')
      .populate('type_of_car')
    if (file === 'excel') {
      const wsData = [
        [
          'S.no',
          'Date',
          'First Name',
          'Last Name',
          'Email',
          'Phone Number',
          'Registation Number',
          'Car Brand Name',
          'Car Model'
        ],
        ...usersList?.map((user, index) => [
          index + 1,
          moment(user?.date).format('D MMMM YYYY'),
          user.client_id?.firstName,
          user.client_id?.lastName,
          user.client_id?.email,
          user.client_id?.phoneNumber,
          user.user?.regNumber,
          user.user?.type_of_car?.main_title,
          user.user?.model
        ])
      ]
      const ws = xlsx.utils.aoa_to_sheet(wsData)

      const wb = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(wb, ws, 'Customers')

      const fileName = 'customers' + Date.now()
      const fullPath = 'public_v1/customersList/' + fileName + '.xlsx'

      xlsx.writeFile(wb, fullPath)

      const filename = path.basename(fullPath)
      const contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

      res.setHeader('Content-disposition', 'attachment; filename=' + filename)
      res.setHeader('Content-type', contentType)

      const filestream = fs.createReadStream(fullPath)

      filestream.on('open', function () {
        filestream.pipe(res)
      })

      filestream.on('end', () => {
        fs.unlink(fullPath, (err) => {
          if (err) throw err
          console.log('successfully deleted ', fullPath)
        })
      })

      filestream.on('error', (err) => {
        console.log(err)
        return res.status(500).send('Error reading Excel file')
      })
    } else if (file === 'csv') {
      const csvData = [
        [
          'S.no',
          'Date',
          'First Name',
          'Last Name',
          'Email',
          'Phone Number',
          'Registation Number',
          'Car Brand Name',
          'Car Model'
        ],
        ...usersList.map((user, index) => [
          index + 1,
          moment(user?.date).format('D MMMM YYYY'),
          user.client_id?.firstName,
          user.client_id?.lastName,
          user.client_id?.email,
          user.client_id?.phoneNumber,
          user?.regNumber,
          user?.type_of_car?.main_title,
          user?.model
        ])
      ]
      const fileName = 'customers' + Date.now() + '.csv'
      const fullPath = path.join('public_v1/customersList/', fileName)

      const csvStream = fastCsv.format({ headers: true })
      const writableStream = fs.createWriteStream(fullPath)

      csvStream.pipe(writableStream)

      csvData.forEach((row) => {
        csvStream.write(row)
      })

      csvStream.end()

      writableStream.on('finish', () => {
        const filename = path.basename(fullPath)
        const contentType = 'text/csv'

        res.setHeader('Content-disposition', 'attachment; filename=' + filename)
        res.setHeader('Content-type', contentType)

        const filestream = fs.createReadStream(fullPath)

        filestream.on('open', function () {
          filestream.pipe(res)
        })

        filestream.on('end', () => {
          fs.unlink(fullPath, (err) => {
            if (err) throw err
            console.log('successfully deleted ', fullPath)
          })
        })

        filestream.on('error', (err) => {
          console.log(err)
          return res.status(500).send('Error reading CSV file')
        })
      })
    } else if (file === 'pdf') {
      const contents = fs.readFileSync('./views/en/repair.ejs', 'utf8')
      const data = usersList
      var html = ejs.render(contents, { data })

      const fileName = 'repairs' + Date.now()
      var options = {
        format: 'A4',
        width: '14in',
        orientation: 'landscape',
        height: '21in',
        timeout: 540000
      }
      pdf
        .create(html, options)
        .toFile(
          'public_v1/repairList/' + fileName + '.pdf',
          async function (err, pdfV) {
            if (err) {
              console.log(err)
              return res.status(500).send('Error generating PDF')
            }

            const fullPath =
              process.env.API_URL2 + 'public_v1/repairList/' + fileName + '.pdf'

            const filename = path.basename(fullPath)
            const contentType = mime.lookup(fullPath)

            res.setHeader(
              'Content-disposition',
              'attachment; filename=' + filename
            )
            res.setHeader('Content-type', contentType)

            const filestream = fs.createReadStream(pdfV.filename)

            filestream.on('data', () => {
              console.log('reading.....')
            })

            filestream.on('open', function () {
              console.log('Open-------------------->')
              filestream.pipe(res)
            })

            filestream.on('end', () => {
              fs.unlink(pdfV.filename, (err) => {
                if (err) throw err
                console.log('successfully deleted ', fullPath)
              })
            })

            filestream.on('error', (err) => {
              console.log(err)
              return res.status(500).send('Error reading PDF')
            })

            filestream.on('close', () => {
              console.log('Stream closed now')
            })
          }
        )
    }
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
exports.downloadInvoiceList = async (req, res) => {
  try {
    const { file, client, start_date, end_date, status } = req.query
    const { id } = req.params
    const isValidDate = (dateString) => {
      const date = new Date(dateString)
      return !isNaN(date.getTime())
    }

    const filters = Object.assign(
      { user_id: id },
      (start_date || end_date) && {
        createdDate: {}
      }
    )
    if (status) {
      filters.status = 'unpaid'
    }
    if (start_date && isValidDate(start_date)) {
      filters.createdDate.$gte = new Date(start_date)
    }

    if (end_date && isValidDate(end_date)) {
      filters.createdDate.$lte = new Date(end_date)
    }
    if (client) {
      filters.clientId = client
    }
    const usersList = await Invoice.find(filters)
      .populate('clientId')
      .populate({ path: 'quotation_id', populate: { path: 'type_of_car' } })
    console.log(usersList)
    if (file === 'excel') {
      const wsData = [
        [
          'S.no',
          'Date',
          'First Name',
          'Last Name',
          'Email',
          'Phone Number',
          'Registation Number',
          'Car Brand Name',
          'Car Model',
          'Total Amount',
          'Paid Amount',
          'Balance'
        ],
        ...usersList?.map((user, index) => [
          index + 1,
          moment(user?.date).format('D MMMM YYYY'),
          user.clientId?.firstName,
          user.clientId?.lastName,
          user.clientId?.email,
          user.clientId?.phoneNumber,
          user.quotation_id?.regNumber,
          user.quotation_id?.type_of_car?.main_title,
          user.quotation_id?.model,
          user.totalAmount,
          user.paidAmount,
          user.balance
        ])
      ]
      const ws = xlsx.utils.aoa_to_sheet(wsData)

      const wb = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(wb, ws, 'invoice')

      const fileName = 'invoice' + Date.now()
      const fullPath = 'public_v1/invoice/' + fileName + '.xlsx'

      xlsx.writeFile(wb, fullPath)

      const filename = path.basename(fullPath)
      const contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

      res.setHeader('Content-disposition', 'attachment; filename=' + filename)
      res.setHeader('Content-type', contentType)

      const filestream = fs.createReadStream(fullPath)

      filestream.on('open', function () {
        filestream.pipe(res)
      })

      filestream.on('end', () => {
        fs.unlink(fullPath, (err) => {
          if (err) throw err
          console.log('successfully deleted ', fullPath)
        })
      })

      filestream.on('error', (err) => {
        console.log(err)
        return res.status(500).send('Error reading Excel file')
      })
    } else if (file === 'csv') {
      const csvData = [
        [
          'S.no',
          'Date',
          'First Name',
          'Last Name',
          'Email',
          'Phone Number',
          'Registation Number',
          'Car Brand Name',
          'Car Model',
          'Total Amount',
          'Paid Amount',
          'Balance'
        ],
        ...usersList?.map((user, index) => [
          index + 1,
          moment(user?.date).format('D MMMM YYYY'),
          user.clientId?.firstName,
          user.clientId?.lastName,
          user.clientId?.email,
          user.clientId?.phoneNumber,
          user.quotation_id?.regNumber,
          user.quotation_id?.type_of_car?.main_title,
          user.quotation_id?.model,
          user.totalAmount,
          user.paidAmount,
          user.balance
        ])
      ]
      const fileName = 'invoices' + Date.now() + '.csv'
      const fullPath = path.join('public_v1/invoice/', fileName)

      const csvStream = fastCsv.format({ headers: true })
      const writableStream = fs.createWriteStream(fullPath)

      csvStream.pipe(writableStream)

      csvData.forEach((row) => {
        csvStream.write(row)
      })

      csvStream.end()

      writableStream.on('finish', () => {
        const filename = path.basename(fullPath)
        const contentType = 'text/csv'

        res.setHeader('Content-disposition', 'attachment; filename=' + filename)
        res.setHeader('Content-type', contentType)

        const filestream = fs.createReadStream(fullPath)

        filestream.on('open', function () {
          filestream.pipe(res)
        })

        filestream.on('end', () => {
          fs.unlink(fullPath, (err) => {
            if (err) throw err
            console.log('successfully deleted ', fullPath)
          })
        })

        filestream.on('error', (err) => {
          console.log(err)
          return res.status(500).send('Error reading CSV file')
        })
      })
    } else if (file === 'pdf') {
      const contents = await fs.readFileSync(
        './views/en/downloadInvoice.ejs',
        'utf8'
      )
      const data = usersList
      var html = await ejs.render(contents, { usersList })

      const fileName = 'invoice' + Date.now()
      var options = {
        format: 'A4',
        width: '14in',
        orientation: 'landscape',
        height: '21in',
        timeout: 540000
      }
      await pdf
        .create(html, options)
        .toFile(
          'public_v1/invoice/' + fileName + '.pdf',
          async function (err, pdfV) {
            if (err) {
              console.log(err)
              return res.status(500).send('Error generating PDF')
            }

            const fullPath =
              process.env.API_URL2 + 'public_v1/invoice/' + fileName + '.pdf'

            const filename = path.basename(fullPath)
            const contentType = mime.lookup(fullPath)

            res.setHeader(
              'Content-disposition',
              'attachment; filename=' + filename
            )
            res.setHeader('Content-type', contentType)

            const filestream = fs.createReadStream(pdfV.filename)

            filestream.on('data', () => {
              console.log('reading.....')
            })

            filestream.on('open', function () {
              console.log('Open-------------------->')
              filestream.pipe(res)
            })

            filestream.on('end', () => {
              fs.unlink(pdfV.filename, (err) => {
                if (err) throw err
                console.log('successfully deleted ', fullPath)
              })
            })

            filestream.on('error', (err) => {
              console.log(err)
              return res.status(500).send('Error reading PDF')
            })

            filestream.on('close', () => {
              console.log('Stream closed now')
            })
          }
        )
    }
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}

exports.sendRemainder = async (req, res) => {
  try {
    const invoice = await Invoice.find({ clientId: req.params.id })
    const client = await Client.findById(req.params.id)
    const totalAmount = invoice.reduce((acc, item) => {
      const itemTotal = Number(item?.total) || 0
      return itemTotal + acc
    }, 0)

    const paidAmount = invoice.reduce((acc, item) => {
      const itemPaidAmount = Number(item?.paid_amount) || 0
      return itemPaidAmount + acc
    }, 0)
    console.log('locate', req.getLocale())
    await emailer.sendPasswordToSubUser(
      req.getLocale(),
      {
        to: client.email,
        name: `${client.firstName} ${client.lastName}`,
        amount: totalAmount - paidAmount,
        subject: 'Reminding about Payment of eurobose',
        email: client.email,
        logo: process.env.LOGO,
        appname: process.env.APP_NAME
      },
      'sendReminder'
    )
    return res.status(200).send({
      code: 200,
      message: 'Email sent successfully'
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      error: error.message,
      message: 'Internal server error'
    })
  }
}

exports.sendReminderEmail = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    const client = await Client.findById(req.body.client_id)
    console.log('client', client)
    const data = await EmailModel.create(req.body)
    console.log('email data', data)

    await await emailer.sendPasswordToSubUser(
      req.getLocale(),
      {
        to: client.email,
        name: `${client.firstName} ${client.lastName}`,
        subject: 'Reminding about Payment of eurobose',
        message: req.body.message,
        logo: process.env.LOGO,
        appname: process.env.APP_NAME
      },
      'sendEmailFollow'
    )
    return res.status(200).json({
      code: 200,
      data: data
    })
  } catch (error) {
    return res
      .status(500)
      .send({ code: 500, message: 'internal server error', error })
  }
}
exports.getAllFollowUpEmails = async (req, res) => {
  try {
    const search = req.query?.search?.toLowerCase().trim()
    const defaultLimit = 10
    const limit = req.query.limit ? parseInt(req.query.limit) : defaultLimit
    const page = req.query.page ? parseInt(req.query.page) : 1

    let data = await EmailModel.find({ user_id: req.user._id }).populate(
      'client_id'
    )
    if (search) {
      data = data?.filter((item) => {
        const lastNameMatch = item?.client_id?.lastName
          ?.toLowerCase()
          .includes(search)
        const firstNameMatch = item?.client_id?.firstName
          ?.toLowerCase()
          .includes(search)
        return lastNameMatch || firstNameMatch
      })
    }

    const totalItems = data ? data.length : 0

    const startIndex = (page - 1) * limit
    const endIndex = Math.min(startIndex + limit - 1, totalItems - 1)
    const paginatedData = data ? data.slice(startIndex, endIndex + 1) : []

    return res.status(200).json({
      code: 200,
      data: paginatedData,
      totalItems: totalItems
    })
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
exports.getSingleFollowUpEmail = async (req, res) => {
  try {
    const data = await EmailModel.findById(req.params.id).populate('client_id')
    return res.status(200).json({
      code: 200,
      data: data
    })
  } catch (error) {
    return res
      .status(500)
      .send({ code: 500, message: 'internal server error', error })
  }
}
function filterPartsByService(data, serviceFilter) {
  data.forEach((invoice) => {
    if (serviceFilter) {
      invoice.parts = invoice?.parts.filter((part) =>
        part?.service
          ?.trim()
          .toLowerCase()
          .includes(serviceFilter.toLowerCase())
      )
    }
  })

  return data
}
exports.getAllRepairs = async (req, res) => {
  try {
    const year = req.query.year
    const search = req.query?.search?.toLowerCase().trim()
    const sort = req.query.sort === 'asc' ? 1 : -1
    const service = req.query?.service
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.limit) || 10

    const filters = {
      user_id: mongoose.Types.ObjectId(req.user._id)
    }

    if (year) {
      filters.date = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }

    const countQuery = Invoice.find(filters)

    const dataQuery = Invoice.find(filters)
      .populate('clientId')
      .populate({
        path: 'quotation_id',
        populate: [
          { path: 'technicians', model: 'sub_user' },
          { path: 'type_of_car' }
        ]
      })
      .sort({ createdAt: sort })

    if (search !== '') {
      dataQuery.or([
        { 'clientId.firstName': { $regex: new RegExp(search, 'i') } },
        { 'clientId.lastName': { $regex: new RegExp(search, 'i') } }
      ])
    }

    if (service) {
      dataQuery.where('parts').elemMatch({ service: new RegExp(service, 'i') })
    }

    const totalItems = await countQuery.countDocuments()
    const currentPageData = await dataQuery
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    const response = {
      data: currentPageData,
      totalItems
    }

    res.send(response)
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
exports.addCarModel = async (req, res) => {
  try {
    const data = req.body
    const user = req.user
    const car = await carlogos.findById(data.id)
    if (!car) {
      return res.status(404).send({
        code: 404,
        message: 'car not found'
      })
    }
    const email_id = await AdminModel.find()
    const description = `A request has been generated by ${user?.first_name} ${user?.last_name} to add the car model "${data.model}" for the brand "${car.main_title}"`
    let notificationObj = {
      sender_id: user._id.toString(),
      receiver_id: email_id[0]._id.toString(),
      type: 'car',
      title: 'Approval Required: Car Query for New Model Addition',
      typeId: car._id,
      objectName: data.model,
      create_admin: true,
      description: description
    }
    await this._sendNotification(notificationObj)
    let payload = {
      description: description,
      user: user._id,
      type: 'Get',
      requestType: 'Car',
      requestId: car?._id,
      requestName: data?.model
    }
    await RequestModel.create(payload)
    return res.send({
      code: 200,
      message: 'Once it will approved you will be notified'
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'internal server error',
      error: error.message
    })
  }
}
exports.checkEmailAndPassword = async (req, res) => {
  try {
    const email = await User.findOne({ email: req.body.email }, { password: 1 })
    if (!email) {
      return res.status(404).send({ code: 404, message: 'Email not found' })
    }
    const isPasswordMatch = await auth.checkPassword(req.body.password, email)

    if (!isPasswordMatch) {
      return res.status(404).send({ code: 404, message: 'invalid password' })
    }
    return res.status(200).send({ code: 200, message: 'Valid User' })
  } catch (error) {
    return res.status(500).send({ code: 500, message: error.message })
  }
}
exports.updateProfile = async (req, res) => {
  try {
    const userData = req.user
    const date = userData?.activationDate
    if (!date) {
      return res
        .status(403)
        .send({ code: 403, message: 'Plan is not activated' })
    }
    const now = new Date()
    const activationDate = new Date(date)
    const expirationDate = new Date(
      activationDate.getTime() + userData.planDurationDays * 24 * 60 * 60 * 1000
    )
    const timeDifference = expirationDate.getTime() - now.getTime()
    const remainingDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24))

    await User.findOneAndUpdate(
      { _id: userData._id },
      { $set: { remainingDays: remainingDays } },
      { new: true }
    )
    return res.send({ code: 200, message: 'successfully updated' })
  } catch (error) {
    return res
      .status(500)
      .send({ code: 500, message: 'Internal  Server Error' })
  }
}
exports.addClicks = async (req, res) => {
  try {
    const click = await ClickModel.find()
    if (click.length === 0) {
      await ClickModel.create({ totalClicks: 1 })
      return res.status(200).send({ code: 200 })
    }
    const totalClicks = click[0].totalClicks + 1
    await ClickModel.findByIdAndUpdate(click[0]._id, {
      $set: { totalClicks: totalClicks }
    })
    return res.status(200).send({ code: 200 })
  } catch (error) {
    return res.status(500).send({ code: 500, message: 'Internal Server Error' })
  }
}
exports.addCarModelBYUser = async (req, res) => {
  try {
    const data = req.body
    const user = req.user
    const car = await carlogos.findById(data.id)
    if (!car) {
      return res.status(404).send({
        code: 404,
        message: 'car not found'
      })
    }

    if (
      car.carmodel.some(
        (model) => model.toLowerCase() === data?.model?.toLowerCase()
      )
    ) {
      return res.status(400).send({
        code: 400,
        message: 'Model already exists'
      })
    }
    car.carmodel.push(data.model)
    const updatedCar = await car.save()
    const email_id = await AdminModel.find()
    const description = `A car model has been added by ${user?.first_name} ${user?.last_name} to add the car model "${data.model}" for the brand "${car.main_title}"`
    let notificationObj = {
      sender_id: user._id.toString(),
      receiver_id: email_id[0]._id.toString(),
      type: 'car',
      title:
        'Added New Model. i.e.' +
        data.model +
        'in brand' +
        ' ' +
        car.main_title,
      typeId: car._id,
      objectName: data.model,
      create_admin: true,
      description: description
    }
    await this._sendNotification(notificationObj)
    return res.send({
      code: 200,
      message: 'Car has been added to the list successfully',
      data: updatedCar
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'internal server error',
      error: error.message
    })
  }
}

exports.addAppContactUs = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    const item = await createItem(ContactUs, data)
    const admin = await Admin.find()
    let notificationObj = {
      receiver_id: admin[0]._id.toString(),
      sender_id: req.user._id.toString(),
      notification_type: 'contact',
      type: 'contact',
      create: true,
      title: 'Query Created',
      typeId: item.data._id.toString(),
      create_admin: true,
      description:
        data.first_name + ' ' + data.last_name + ' ' + 'has sent the query'
    }
    await this._sendNotification(notificationObj)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}
exports.addCarAndModel = async (req, res) => {
  try {
    const admin = await Admin.find()
    const { brand, model, category, logo } = req.body
    const car = await carlogos.findOne({
      main_title: new RegExp('^\\s*' + brand + '\\s*$', 'i')
    })
    console.log(car)
    if (car) {
      return res
        .status(403)
        .json({ code: 403, message: 'Brand name already exists' })
    }
    let payload = {
      main_title: brand,
      carmodel: model,
      category_title: category
    }
    if (logo) {
      payload.logo = logo
    }
    const newCars = await carlogos.create(payload)
    const email_id = await AdminModel.find()
    const description = `A new car model, "${model}," has been added to the brand "${brand}" by ${req.user?.first_name} ${req.user?.last_name} with category ${category}.`

    let notificationObj = {
      sender_id: req.user._id.toString(),
      receiver_id: email_id[0]._id.toString(),
      type: 'car',
      notification_type: 'car',
      create: true,
      title: `New Car Added: ${model} (${brand})`,
      objectName: model,
      create_admin: true,
      description: description
    }

    await this._sendNotification(notificationObj)

    await this._sendNotification(notificationObj)
    return res.status(200).send({
      code: 200,
      data: newCars
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error',
      error: error.message
    })
  }
}
exports.garagePayment = async (req, res) => {
  try {
    const { token, amount } = req.body

    const customer = await stripe.customers.create({
      email: req.user.email,
      source: token
    })
    if (req.query.save === true) {
      await Client.findOneAndUpdate(
        { email: req.user.email },
        {
          $set: {
            stripeCustomerId: customer.id
          }
        }
      )
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'EUR',
      customer: customer.id,
      confirm: true,
      return_url: process.env.Website_link
    })

    return res.send({ code: 200, clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error'
    })
  }
}
exports.updatePaymentInvoice = async (req, res) => {
  try {
    const { id, amount } = req.body
    let invoice = await Invoice.findById(id)
    let updatedInvoice
    if (invoice.status === 'unpaid') {
      if (Math.floor(Number(invoice.total)) === Math.floor(amount)) {
        updatedInvoice = await Invoice.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'fully_paid',
              balance: 0,
              paid_amount: Number(invoice.total)
            }
          },
          { new: true }
        )
      } else {
        const newBalance = Number(invoice.balance) - Number(amount)
        const newPaidAmount = Number(invoice.paid_amount) + Number(amount)
        updatedInvoice = await Invoice.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'partially_paid',
              balance: newBalance,
              paid_amount: newPaidAmount
            }
          },
          { new: true }
        )
      }
    } else if (invoice.status === 'partially_paid') {
      if (Math.floor(invoice.balance) == Math.floor(amount)) {
        console.log(1)
        invoice = await Invoice.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'fully_paid',
              balance: 0,
              paid_amount: Number(invoice.total)
            }
          },
          { new: true }
        )
      } else {
        const newBalance = Number(invoice.balance) - Number(amount)
        const newPaidAmount = Number(invoice.paid_amount) + Number(amount)
        updatedInvoice = await Invoice.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'partially_paid',
              balance: newBalance,
              paid_amount: newPaidAmount
            }
          },
          { new: true }
        )
      }
    }
    return res.send({ code: 200, data: updatedInvoice })
  } catch (error) {
    console.log(error)
    return res.status(500).send({
      code: 500,
      message: 'Internal server error'
    })
  }
}
exports.downloadSingleInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('clientId')
    if (!invoice) {
      return res.status(404).send({ code: 404, message: 'Invoice not found' })
    }
    const contents = fs.readFileSync('./views/en/singleInvoice.ejs', 'utf8')

    var html = ejs.render(contents, { invoice })

    const fileName = 'invoice' + Date.now()
    var options = {
      format: 'A4',
      width: '14in',
      orientation: 'landscape',
      height: '21in',
      timeout: 540000
    }
    pdf
      .create(html, options)
      .toFile(
        'public_v1/invoice/' + fileName + '.pdf',
        async function (err, pdfV) {
          if (err) {
            console.log(err)
            return res.status(500).send('Error generating PDF')
          }

          const fullPath =
            process.env.API_URL2 + 'public_v1/invoice/' + fileName + '.pdf'

          const filename = path.basename(fullPath)
          const contentType = mime.lookup(fullPath)

          res.setHeader(
            'Content-disposition',
            'attachment; filename=' + filename
          )
          res.setHeader('Content-type', contentType)

          const filestream = fs.createReadStream(pdfV.filename)

          filestream.on('data', () => {
            console.log('reading.....')
          })

          filestream.on('open', function () {
            console.log('Open-------------------->')
            filestream.pipe(res)
          })

          filestream.on('end', () => {
            fs.unlink(pdfV.filename, (err) => {
              if (err) throw err
              console.log('successfully deleted ', fullPath)
            })
          })

          filestream.on('error', (err) => {
            console.log(err)
            return res.status(500).send('Error reading PDF')
          })

          filestream.on('close', () => {
            console.log('Stream closed now')
          })
        }
      )
  } catch (error) {
    console.log(error.message)
    return res.status(200).send({ code: 500, message: error.message })
  }
}
exports.getInvoiceData = async (req, res) => {
  try {
    console.log(req.user)
    const invoices = await Invoice.aggregate([
      {
        $match: { user_id: mongoose.Types.ObjectId(req.user._id) }
      },
      {
        $group: {
          _id: null,
          due_amount: {
            $sum: {
              $cond: [
                { $lt: ['$sendDate', new Date('2024-01-04T00:00:00.000Z')] },
                { $toDouble: '$balance' },
                0
              ]
            }
          },
          overdue_amount: {
            $sum: {
              $cond: [
                { $gte: ['$sendDate', new Date('2024-01-04T00:00:00.000Z')] },
                { $toDouble: '$balance' },
                0
              ]
            }
          },
          total_amount: { $sum: { $toDouble: '$balance' } }
        }
      }
    ])
    console.log(invoices)
    const averageInvoice = await Invoice.aggregate([
      {
        $match: { user_id: mongoose.Types.ObjectId(req.user._id) }
      },
      {
        $project: {
          _id: 0,
          invoiceDate: {
            $cond: [
              { $ifNull: ['$payment_date', false] },
              '$paymentDate',
              '$createdAt'
            ]
          },
          paid_amount: 1
        }
      },
      {
        $group: {
          _id: null,
          totalDaysToPay: {
            $avg: {
              $cond: [
                { $ifNull: ['$createdDate', false] },
                {
                  $divide: [
                    { $subtract: ['$createdDate', '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                },
                null
              ]
            }
          },
          totalPayments: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          avgTimeToPay: {
            $ifNull: ['$totalDaysToPay', 0]
          },
          totalPayments: 1
        }
      }
    ])
    // console.log(averageInvoice)
    invoices[0].averageTime = averageInvoice[0]?.avgTimeToPay

    let payload = {
      due_amount: invoices[0]?.due_amount?.toFixed(2),
      overdue_amount: invoices[0]?.overdue_amount?.toFixed(2),
      total_amount: invoices[0]?.total_amount?.toFixed(2),
      averageTime: invoices[0]?.averageTime
    }
    return res.send({
      code: 200,
      data: payload
    })
  } catch (error) {
    return res.status(500).send({ code: 500, message: error.message })
  }
}
exports.approveInvoiceDraft = async (req, res) => {
  try {
    const updateinvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { draft: false },
      { new: true }
    )
    return res.status(200).send({
      code: 200,
      data: updateinvoice
    })
  } catch (error) {
    return (
      res.status(500),
      send({
        code: 500,
        message: 'Internal server error'
      })
    )
  }
}
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id)
    return res.status(200).json({
      code: 200,
      message: 'Successfully deleted'
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error'
    })
  }
}
exports.add_fcm_token = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
      return res.status(404).json({ code: 404, message: 'User not found' })
    }

    const existingTokenIndex = user.fcmTokens.findIndex(
      (token) => token.device_id === req.body.device_id
    )

    if (existingTokenIndex !== -1) {
      user.fcmTokens[existingTokenIndex] = {
        device_id: req.body.device_id,
        token: req.body.token,
        device_type: req.body.device_type
      }
    } else {
      user.fcmTokens.push({
        device_id: req.body.device_id,
        token: req.body.token,
        device_type: req.body.device_type
      })
    }

    await user.save()

    return res
      .status(200)
      .json({ code: 200, message: 'FCM token added successfully' })
  } catch (error) {
    return res.status(500).send({ code: 500, message: 'Internal Server Error' })
  }
}

exports.getVatList = async (req, res) => {
  try {
    const data = await VatModel.find()
    return res.send({
      code: 200,
      data: data
    })
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Internal Server Error'
    })
  }
}
exports.getAppointmentInfo = async (req, res) => {
  try {
    const data = await Calendar.findById(req.params.id)
    return res.status(200).send({
      code: 200,
      data: data
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({ code: 500, message: 'Internal Server Error' })
  }
}
exports.deleteSubUser = async (req, res) => {
  try {
    await Sub_user.findByIdAndDelete(req.params.id)
    return res.status(200).send({
      code: 200,
      data: null,
      message: 'sub user deleted successfully'
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({ code: 500, message: 'Internal Server Error' })
  }
}
exports.findQuotation = async (req, res) => {
  try {
    console.log(req.user._id)
    const quotation = await Quote.find({
      $and: [
        { regNumber: req.params.id },
        { user_id: req.user._id },
        { client_id: { $exists: true, $ne: null } }
      ]
    })
      .populate('client_id')
      .populate('type_of_car')
      .populate('technicians')
    if (!quotation || quotation.length === 0) {
      return res.status(404).send({ code: 404, message: 'Quotation not found' })
    }
    return res.status(200).send({ code: 200, data: quotation })
  } catch (error) {
    return res.status(500).send({ code: 500, message: 'Internal server error' })
  }
}
exports.getInvoiceDetails = async (req, res) => {
  try {
    const invoice = await Invoice.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(req.params.id) }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      {
        $unwind: '$clientDetails'
      }
    ])

    let { userDetails, clientDetails } = invoice[0]
    let emails = []
    emails.push(userDetails?.email)
    for (const item of userDetails?.secondary_emails) {
      if (item.verification_status) {
        emails.push(item.email)
      }
    }
    let payload = {
      user_id: userDetails._id,
      user_emails: emails,
      user_name: userDetails.first_name + ' ' + userDetails.last_name,
      client_id: clientDetails?._id,
      client_email: clientDetails?.email,
      client_first_name: clientDetails?.firstName,
      client_last_name: clientDetails?.lastName,
      invoice_number: invoice[0]?.invoiceNumber,
      total_amount: invoice[0]?.total,
      due_date: invoice[0]?.sendDate
    }
    return res.status(200).send({ code: 200, data: payload })
  } catch (error) {
    console.log(error.message)
    return res.status(500).send({ code: 500, message: 'Internal server error' })
  }
}
