const {
  handleError,
  getIP,
  buildErrObject,
  getCountryCode
} = require('../middleware/utils')
const db = require('../middleware/db')
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
  getItemCustom
} = require('../shared/core')
const {
  getUserIdFromToken,
  uploadFile,
  capitalizeFirstLetter,
  validateFileSize,
  objectToQueryString
} = require('../shared/helpers')
var mongoose = require('mongoose')
const { GET, POST } = require('../middleware/axios')
const { matchedData } = require('express-validator')
var fs = require('fs')
var moment = require('moment')
const { lookup } = require('geoip-lite')
var path = require('path')
var mime = require('mime-types')
var uuid = require('uuid')
const emailer = require('../middleware/emailer')

const STORAGE_PATH_HTTP = process.env.STORAGE_PATH_HTTP
const STORAGE_PATH = process.env.STORAGE_PATH
const keywordsApi = process.env.KEYWORDS_API
const companiesApi = process.env.COMPANIES_API
const universitiesApi = process.env.UNIVERSITIES_API
const countries = require('country-state-city').Country
const log4js = require('log4js')
// const currencyConverter = require('currency-converter-lt');
const CC = require('currency-converter-lt')
let currencyConverter = new CC()
const states = require('country-state-city').State
const cities = require('country-state-city').City
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// DING base URL
const DING_BASE_URL = 'https://api.dingconnect.com/api/V1/'

// * models

const CMS = require('../models/cms')
const User = require('../models/user')
const ContactUs = require('../models/contact_us')
const Country = require('../models/country')
const Chat = require('../models/chat')
const Room = require('../models/room')
const Subscription = require('../models/subscription')
const Faq = require('../models/faq')
const Notification = require('../models/notification')
const FCMDevice = require('../models/fcm_devices')

// Twilio
const AccessToken = require('twilio').jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant

// Used when generating any kind of tokens
// To set up environmental variables, see http://twil.io/secure
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioApiKey = process.env.TWILIO_API_KEY
const twilioApiSecret = process.env.TWILIO_API_SECRET
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

const ClientCapability = require('twilio').jwt.ClientCapability
const VoiceResponse = require('twilio').twiml.VoiceResponse
const VoiceGrant = AccessToken.VoiceGrant

const client = require('twilio')(twilioAccountSid, twilioAuthToken)

const dir___2 = '/var/www/html/acclem-rest-apis/'
/**
 * Upload Media function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */

exports.uploadUserMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: 'MEDIA OR PATH MISSING'
      })
    }
    let media = await uploadFile({
      file: req.files.media,
      path: `${STORAGE_PATH}/${req.body.path}`
    })
    let mediaurl = `${STORAGE_PATH_HTTP}/${req.body.path}/${media}`

    const mimeType = mime.lookup(media)

    return res.status(200).json({
      code: 200,
      path: mediaurl,
      mimeType: mimeType
    })
  } catch (error) {
    handleError(res, error)
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
  //console.log"In log back");

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

exports.getLanguages = async (req, res) => {
  try {
    let data = req.query
    const item = await db.getLanguages(Language, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getOccupations = async (req, res) => {
  try {
    let data = req.query
    const item = await db.getOccupations(Occupation, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSubOccupations = async (req, res) => {
  try {
    let data = req.query
    const item = await db.getSubOccupations(SubOccupation, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSkills = async (req, res) => {
  try {
    let data = req.query
    const item = await db.getSkills(Skill, data)
    return res.status(200).json(item)
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
          cities.getCitiesOfState(req.query.country_code, req.query.state_code)
        )
    }
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateProfessionalProfile = async (req, res) => {
  try {
    let data = req.body
    let last_step = data.step
    let profile_percentage = data.percentage
    delete data.step
    delete data.percentage
    var model
    if (req.user.role == 'Client') {
      model = User
    } else {
      model = Professional
    }
    item = await updateItem(
      model,
      {
        _id: mongoose.Types.ObjectId(req.user._id)
      },
      {
        $set: data,
        $max: {
          last_step,
          profile_percentage
        }
      },
      {
        fields: {
          _id: 1,
          last_step: 1,
          profile_percentage: 1
        }
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProfessionalProfile = async (req, res) => {
  try {
    req.body.user_id = req.user._id
    const item = await db.getProfessionalProfile(User, req.body)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getMatchingKeyWords = async (req, res) => {
  try {
    const keywords = await GET(
      // hit the api using axios
      `${keywordsApi}?ml=${req.params.keyword}`,
      {},
      {}
    )
    return res.status(200).json(
      keywords
        .sort((first, second) => {
          return first.score > second.score
        })
        .map((item) => {
          return item.word
        })
    )
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceCategories = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    const item = await db.getServiceCategories(ServiceCategory, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceSubCategories = async (req, res) => {
  try {
    let data = {
      ...req.query,
      ...req.params
    }
    const item = await db.getServiceSubCategories(ServiceSubCategory, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getHouseTypes = async (req, res) => {
  try {
    const item = await db.getHouseTypes(HouseType, req.query)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getHouseSubTypes = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    const item = await db.getHouseSubTypes(HouseSubType, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServices = async (req, res) => {
  try {
    let data = req.query
    const item = await db.getServices(Service, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateProfessionalService = async (req, res) => {
  try {
    let step = req.body.step
    delete req.body.step
    req.body.professional_id = req.user._id
    const item = await updateItem(
      ProfessionalService,
      {
        _id: req.body.professional_service_id ?? new mongoose.Types.ObjectId()
      },
      {
        $set: req.body,
        $max: {
          step
        },
        $pull: {
          images: req.body.path
        }
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        fields: {
          _id: 1,
          step: 1
        }
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.removeServiceImage = async (req, res) => {
  try {
    fs.unlink(
      path.join(
        'public/professionalServiceImages/' + req.body.path.split('/').pop()
      ),
      function (response) {}
    )
    const item = await updateItemThroughId(
      ProfessionalService,
      req.body.professional_service_id,
      {
        $pull: {
          images: req.body.path
        }
      },
      {
        fields: {
          _id: 1
        }
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.removeServiceMedia = async (req, res) => {
  try {
    let folder = 'professionalServiceVideos/'
    if (req.body.type == 'document') {
      folder = 'professionalServiceDocuments/'
    }
    fs.unlink(
      path.join('public/' + folder + req.body.path.split('/').pop()),
      function (response) {}
    )
    const item = await updateItemThroughId(
      ProfessionalService,
      req.body.professional_service_id,
      {
        $set: {
          [req.body.type]: ''
        }
      },
      {
        fields: {
          _id: 1
        }
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProfessionalServices = async (req, res) => {
  try {
    let data = req.query
    if (req.headers.authorization) {
      req.headers.authorization = req.headers.authorization.replace(
        'Bearer ',
        ''
      )
      data.user_id = (await getUserIdFromToken(req.headers.authorization))._id
    }
    const item = await db.getProfessionalServices(ProfessionalService, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProfessionalServiceDetails = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    if (
      data.screen == 'create_new_service' ||
      data.screen == 'service_checkout'
    ) {
      let select = ''
      if (data.screen == 'service_checkout') {
        select = `
        service_sub_category_id
        single_plan.${data.plan_type}.price
        single_plan.${data.plan_type}.estimated_time
        single_plan.${data.plan_type}.estimated_time_unit
        single_plan.price_per
        single_plan.plans
        single_plan.title
        city
        operating_since
        execution_time
        market_share
        keywords
        unit
        airline
        advertisement_type
        height
        width
        purpose_of_advertisement
        ad_placement
        advertisement_format
        price
        discount
        airport
        airport_type
        airstatus
        airport_rank
        date
        domestic_travellers
        airport_rank
        internation_travellers
        total_operating_destination
        no_of_airline
        no_of_terminals
        monthly_passenger
        cinema
        cinema_chain_brand
        screen_category
        screen_type
        screen_code
        screen_number
        capacity
        mall_details
        movie_type
        mediamagazine
        frequency
        circulation
        magazineLang
        readership
        audience_type
        magazine_cat
        service
        cover_price
        resolution
        geo_coverage
        `
      }
      var item = await getItemThroughId(
        ProfessionalService,
        data.professional_service_id,
        false,
        select
      )
    } else {
      var item = await db.getProfessionalServiceDetails(
        ProfessionalService,
        data
      )
    }
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProfessionalServiceQuestions = async (req, res) => {
  try {
    const item = await getItemThroughId(
      ProfessionalService,
      req.params.professional_service_id,
      false,
      'questions professional_id'
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.createServiceBooking = async (req, res) => {
  try {
    let data = req.body
    if (req.headers.authorization) {
      req.headers.authorization = req.headers.authorization.replace(
        'Bearer ',
        ''
      )
      const user = await getUserIdFromToken(req.headers.authorization)
      if (user.role != 'Client') {
        return res.status(200).json({
          success: false,
          message: 'Please continue with client account'
        })
      }
      data.user_id = user._id
    }
    const item = await createItem(ServiceBooking, data)

    // Send notification to the Professional
    const item2 = await createItem(Notification, {
      value_id: item.data._id,
      title: `You have new booking #${item.data.order_id}`,
      notification_type: 'bookings',
      role: 'Professional',
      user_id: item.data.professional_id,
      description: `You have new booking #${item.data.order_id}. Kindly check all details`
    })

    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceFees = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServiceFees(CommissionAndDiscount, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateAddress = async (req, res) => {
  try {
    let data = req.body
    data.user_id = req.user._id
    if (!data.is_default) {
      let oldAddress = await countDocuments(UserAddress, {
        user_id: mongoose.Types.ObjectId(data.user_id)
      })
      if (oldAddress > 0) {
        data.is_default = 0
      }
    } else {
      await updateItems(
        UserAddress,
        { user_id: mongoose.Types.ObjectId(data.user_id) },
        { is_default: 0 }
      )
    }
    const item = await updateItem(
      UserAddress,
      {
        _id: mongoose.Types.ObjectId(data.address_id)
      },
      data,
      {
        upsert: true,
        setDefaultsOnInsert: true
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getAddresses = async (req, res) => {
  try {
    let data = req.query
    data.user_id = req.user._id
    const item = await db.getAddresses(UserAddress, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteAddress = async (req, res) => {
  try {
    const item = await deleteItem(UserAddress, req.params.address_id)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateServiceBooking = async (req, res) => {
  try {
    let data = req.body
    data.user_id = req.user._id
    data.addresses = (await db.getAddresses(UserAddress, data)).data

    data.service_details = (
      await getItemThroughId(
        ProfessionalService,
        data.professional_service_id,
        true,
        {
          [`single_plan.${data.plan_type}`]: 1,
          'single_plan.services': 1,
          [`continues_plan.${data.plan_type}`]: 1,
          'continues_plan.services': 1,
          service_id: 1,
          service_category_id: 1,
          service_sub_category_id: 1,
          title: 1,
          description: 1,
          images: 1
        }
      )
    ).data

    data.booking_completed = true
    data.status = 'pending'
    var item = await updateItemThroughId(ServiceBooking, data.booking_id, data)

    item.data = JSON.parse(JSON.stringify(item.data))
    var user_details = (await getItemThroughId(User, item.data.user_id, true))
      .data

   
    var professional_details = (
      await getItemThroughId(User, item.data.professional_id, true)
    ).data
   
    item.data.user_details = user_details
    item.data.professional_details = professional_details
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getBookingDetails = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    if (data.screen == 'service_checkout') {
      var item = await getItemThroughId(
        ServiceBooking,
        data.booking_id,
        true,
        'booking_completed'
      )
    } else {
      var item = await db.getBookingDetails(ServiceBooking, data)
    }
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getOrders = async (req, res) => {
  try {
    let data = req.query
    data.user_id = req.user._id
    let item = await db.getOrders(ServiceBooking, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getGeneralManagement = async (req, res) => {
  try {
    let item = await db.getGeneralManagement(GeneralManagement, req.params.type)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateBookingStatus = async (req, res) => {
  try {
    let data = req.body
    const item = await updateItemThroughId(
      ServiceBooking,
      data.booking_id,
      data
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteService = async (req, res) => {
  try {
    const item = await deleteItem(ProfessionalService, req.params.service_id)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.cloneService = async (req, res) => {
  try {
    let data = req.body
    let item = (await getItemThroughId(ProfessionalService, data.service_id))
      .data
    item = item.toObject()
    delete item._id
    const result = await createItem(ProfessionalService, item)
    return res.status(200).json(result)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceFormQuestions = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServiceFormQuestions(ServiceFormQuestion, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceFormSteps = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServiceFormSteps(ServiceFormStep, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceFormHeadings = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServiceFormHeadings(ServiceFormHeading, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCompanies = async (req, res) => {
  try {
    const companies = await GET(
      // hit the api using axios
      `${companiesApi}?query=${req.params.search}`,
      {},
      {}
    )
    return res.status(200).json(companies)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getUniversities = async (req, res) => {
  try {
    const universities = await GET(
      // hit the api using axios
      `${universitiesApi}?name=${req.query.search}&country=${req.query.country}`,
      {},
      {}
    )

    return res.status(200).json(universities)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProductCategories = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getProductCategories(ProductCategory, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProductSubCategories = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getProductSubCategories(ProductSubCategory, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.addProduct = async (req, res) => {
  try {
    req.body.professional_id = req.user._id
    const item = await updateItem(
      Product,
      {
        _id: req.body.product_id ?? new mongoose.Types.ObjectId()
      },
      {
        $set: req.body,
        $pull: {
          images: req.body.path
        }
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        fields: {
          _id: 1,
          name: 1
        }
      }
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProducts = async (req, res) => {
  try {
    let data = req.query
    data.professional_id = req.user._id
    const item = await db.getProducts(Product, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getProductDetails = async (req, res) => {
  try {
    let data = req.params
    const item = await getItemThroughId(Product, data.product_id)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getJobCategories = async (req, res) => {
  try {
    const item = await db.getJobCategories(JobCategory, req.query)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getJobSkills = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    const item = await db.getJobSkills(JobSkill, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.postJob = async (req, res) => {
  try {
    req.body.client_id = req.user._id
    const item = await createItem(Job, req.body)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getJobs = async (req, res) => {
  try {
    let data = req.query
    if (req.headers.authorization) {
      req.headers.authorization = req.headers.authorization.replace(
        'Bearer ',
        ''
      )
      data.user_id = (await getUserIdFromToken(req.headers.authorization))._id
    }
    const item = await db.getJobs(Job, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getPostedJobs = async (req, res) => {
  try {
    let data = req.query

    data.user_id = req.user._id

    const item = await db.getPostedJobs(Job, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getJobDetails = async (req, res) => {
  try {
    let data = {
      ...req.params,
      ...req.query
    }
    if (data.screen == 'post-job') {
      var item = await getItemThroughId(Job, data.job_id)
    } else {
      var item = await db.getJobDetails(Job, data)
    }
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.submitJobProposal = async (req, res) => {
  try {
    let data = req.body
    req.body.professional_id = req.user._id

    if (await db.hasProfessionalAppliedToJob(JobProposal, data)) {
      return res.status(200).json({
        success: false,
        message: 'You have already submitted a proposal for this job'
      })
    }

    const item = await createItem(JobProposal, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.updateJobProposalStatus = async (req, res) => {
  try {
    let data = req.body

    const item = await updateItemThroughId(JobProposal, data.job_proposal_id, {
      status: data.status
    })

    if (data.status == 'hired') {
      await updateItemThroughId(Job, data.job_id, {
        professional_hired: true
      })
    }

    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServicePlans = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServicePlans(ServicePlan, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getServiceFormTooltips = async (req, res) => {
  try {
    let data = req.params
    const item = await db.getServiceFormTooltips(ServiceFormToolTip, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getDiscountStatus = async (req, res) => {
  try {
    let data = {
      ...req.params
    }

    const item = await db.getDiscountStatus(CommissionAndDiscount, data)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.jobPlatformCommission = async (req, res) => {
  try {
    const data = req.query
    const ip = getIP(req)
    const info = lookup(ip)
    data.info = info
    const commission = await db.jobPlatformCommission(JobCommission, data)

    res.json({
      code: 200,
      data: commission
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getJobProposals = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    data.user_id = req.user._id

    const result = await db.getJobProposals(JobProposal, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getJobProposalDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    data.user_id = req.user._id

    const result = await db.getJobProposalDetails(JobProposal, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getBlogs = async (req, res) => {
  try {
    const data = req.query

    const ip = getIP(req)
    const info = getCountryCode(lookup(ip))
    data.info = info

    

    const result = await db.getBlogs(Blog, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getBlogDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const result = await db.getBlogDetails(Blog, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.jobHireProfessional = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id

    const proposal = (
      await getItemCustom(JobProposal, { _id: data.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const job = (
      await getItemCustom(Job, { _id: proposal.job_id, user_id: data.user_id })
    ).data
    data.job = job

    if (!job) throw buildErrObject(404, 'Job not found')

    const result = await db.jobHireProfessional(JobProposalContract, data)

    res.json({
      code: 200,
      job
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getClientJobProposals = async (req, res) => {
  try {
    const data = req.query
    data.user_id = req.user._id
    const result = await db.getClientJobProposals(JobProposalContract, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getProfessionalContracts = async (req, res) => {
  try {
    const data = req.query
    data.user_id = req.user._id
    const result = await db.getProfessionalContracts(JobProposalContract, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getClientContractDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }
    data.user_id = req.user._id

    data.condition = {
      user_id: mongoose.Types.ObjectId(data.user_id),
      _id: mongoose.Types.ObjectId(data.contract_id)
    }

    const result = await db.getContractDetails(JobProposalContract, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getProfessionalContractDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }
    data.user_id = req.user._id

    data.condition = {
      professional_id: mongoose.Types.ObjectId(data.user_id),
      _id: mongoose.Types.ObjectId(data.contract_id)
    }

    const result = await db.getContractDetails(JobProposalContract, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCareerJobs = async (req, res) => {
  try {
    const data = req.query

    const result = await db.getCareerJobs(CareerJob, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCareerJobsDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const result = await db.getCareerJobsDetails(CareerJob, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.applyCareerJob = async (req, res) => {
  try {
    const data = req.body

    if (!req.files) {
      throw buildErrObject(400, 'A resume is required')
    }

    data.user_id = req.user._id

    await validateFileSize(req.files.resume, 5242880) // equals to 5 MB // send size in Byte

    // console.log(STORAGE_PATH_HTTP)

    let media = await uploadFile({
      file: req.files.resume,
      path: `${STORAGE_PATH}/careerJobAppliedResume`
    })
    let mediaurl = `${STORAGE_PATH_HTTP}/careerJobAppliedResume/${media}`

    data.resume = mediaurl

    await db.applyCareerJob(CareerJobApplied, data)

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getContractMilestonePaymentDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const list = await db.getContractMilestonePaymentDetails(
      JobProposalContractPayment,
      data
    )

    res.json({
      code: 200,
      data: list
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.addClientProposalMilestone = async (req, res) => {
  try {
    const data = req.body

    const result = await db.addClientProposalMilestone(JobProposal, data)

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.gethomePageVideo = async (req, res) => {
  try {
    // const item = await getItemThroughId(HomePageVideo,req.params._id)
    const item = (await getItemCustom(HomePageVideo, { type: req.params.type }))
      .data
    return res.status(200).json(item)
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

exports.getRecommendedServices = async (req, res) => {
  try {
    const item = await db.getRecommendedServices(RecommendedService)
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.sendMileStoneReview = async (req, res) => {
  try {
    const data = req.body

    const contract = (
      await getItemCustom(JobProposalContract, { _id: data.contract_id })
    ).data
    data.contract = contract

  

    if (!contract) throw buildErrObject(404, 'Contract not found')

    const proposal = (
      await getItemCustom(JobProposal, { _id: contract.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const milestone = proposal.milestones.find(
      (item) => item._id == data.milestone_id
    )
    if (!milestone) throw buildErrObject(404, 'Milestone not found')

    if (milestone.status != 'active')
      throw buildErrObject(422, 'Milestone should be active')

    const job = (await getItemCustom(Job, { _id: proposal.job_id })).data
    data.job = job

    if (!job) throw buildErrObject(404, 'Job not found')

    if (req.files && req.files.document) {
      let media = await uploadFile({
        file: req.files.document,
        path: `${STORAGE_PATH}/clientJobDocuments`
      })
      let mediaurl = `${STORAGE_PATH_HTTP}/clientJobDocuments/${media}`

      data.work_proof = mediaurl
    } else {
      data.work_proof = ''
    }

    const result = await db.sendMileStoneReview(
      JobProposalContractActivity,
      data
    )

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.acceptRejectMilestone = async (req, res) => {
  try {
    const data = req.body

    const contract = (
      await getItemCustom(JobProposalContract, { _id: data.contract_id })
    ).data
    data.contract = contract

  

    if (!contract) throw buildErrObject(404, 'Contract not found')

    const proposal = (
      await getItemCustom(JobProposal, { _id: contract.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const milestone = proposal.milestones.find(
      (item) => item._id == data.milestone_id
    )
    if (!milestone) throw buildErrObject(404, 'Milestone not found')

    if (milestone.status != 'active')
      throw buildErrObject(422, 'Milestone should be active')

    const job = (await getItemCustom(Job, { _id: proposal.job_id })).data
    data.job = job

    // console.log("")

    if (job.client_id != req.user._id)
      throw buildErrObject(422, 'You are not authorised to do this')

    if (!job) throw buildErrObject(404, 'Job not found')

    const result = await db.acceptRejectMilestone(
      JobProposalContractActivity,
      JobProposal,
      data
    )

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMilestoneReview = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const result = await db.getMilestoneReview(
      JobProposalContractActivity,
      data
    )

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMilestoneReviewDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const result = await db.getMilestoneReviewDetails(
      JobProposalContractActivity,
      data
    )

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.startMilestone = async (req, res) => {
  try {
    const data = req.body

    const contract = (
      await getItemCustom(JobProposalContract, { _id: data.contract_id })
    ).data
    data.contract = contract



    if (!contract) throw buildErrObject(404, 'Contract not found')

    const proposal = (
      await getItemCustom(JobProposal, { _id: contract.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const milestone = proposal.milestones.find(
      (item) => item._id == data.milestone_id
    )
    if (!milestone) throw buildErrObject(404, 'Milestone not found')

    // if(milestone.status != "active") throw buildErrObject(422, "Milestone should be active")
    // Check if already milstone is active then send error for already another milestone is active.
    const isActiveMilestone = proposal.milestones.find(
      (item) => item.status == 'active'
    )

    if (isActiveMilestone)
      throw buildErrObject(422, 'Another milestone is already active')

    const job = (await getItemCustom(Job, { _id: proposal.job_id })).data
    data.job = job

    if (!job) throw buildErrObject(404, 'Job not found')

    const result = await db.startMilestone(JobProposal, data)

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.jobProposalFeedback = async (req, res) => {
  try {
    const data = req.body

    const contract = (
      await getItemCustom(JobProposalContract, { _id: data.contract_id })
    ).data
    data.contract = contract



    if (!contract) throw buildErrObject(404, 'Contract not found')

    const proposal = (
      await getItemCustom(JobProposal, { _id: contract.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const job = (await getItemCustom(Job, { _id: proposal.job_id })).data
    data.job = job

    // console.log("")

    // if(job.client_id != req.user._id) throw buildErrObject(422, "You are not authorised to do this")

    if (!job) throw buildErrObject(404, 'Job not found')

    const result = await db.jobProposalFeedback(
      JobProposalContractFeedback,
      data
    )

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.createPaymentIntent = async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      }
    })

    res.json({
      code: 200,
      paymentIntent: paymentIntent
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.popularProfessionalServices = async (req, res) => {
  try {
    const data = req.query
    const popularProfessionalServices = await db.popularProfessionalServices(
      PopularProfessionalService,
      data
    )
    res.json({
      code: 200,
      data: popularProfessionalServices
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.addContactUs = async (req, res) => {
  try {
    const data = req.body
    const addContactUs = await createItem(ContactUs, data)
    res.json({
      code: 200,
      data: addContactUs
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.becomeProfessional = async (req, res) => {
  try {
    const data = req.body

    data.user_id = req.user._id

    await db.becomeProfessional(User, data)
    await createItem(AdminNotification, {
      value_id: data.user_id,
      title: 'Become Professional Request',
      notification_type: 'request',
      role: 'superAdmin',
      admin_id: '6312e584ac548c0d4af17046',
      description: `User ${req.user.username} Request For Become Professional`
    })

    res.json({
      code: 200,
      data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.becomeClient = async (req, res) => {
  try {
    const data = req.body

    data.user_id = req.user._id

    await db.becomeClient(User, data)

    res.json({
      code: 200,
      data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getProposalFeedback = async (req, res) => {
  try {
    const data = req.params

    const contract = (
      await getItemCustom(JobProposalContract, { _id: data.contract_id })
    ).data
    data.contract = contract

    console.log(contract)

    if (!contract) throw buildErrObject(404, 'Contract not found')

    const proposal = (
      await getItemCustom(JobProposal, { _id: contract.proposal_id })
    ).data
    data.proposal = proposal

    if (!proposal) throw buildErrObject(404, 'Proposal not found')

    const job = (await getItemCustom(Job, { _id: proposal.job_id })).data
    data.job = job

    // console.log("")

    // if(job.client_id != req.user._id) throw buildErrObject(422, "You are not authorised to do this")

    if (!job) throw buildErrObject(404, 'Job not found')

    const result = await db.getProposalFeedback(
      JobProposalContractFeedback,
      data
    )

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCurrency = async (req, res) => {
  try {
    res.json({
      code: 200,
      data: await getItemsCustom(Currency, {})
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.currencyConverter = async (req, res) => {
  try {
    const data = req.body
    if (!(data.currency_type && data.amount)) {
      throw buildErrObject(422, 'Please Send Currency Type or Amount')
    }
    const result = await currencyConverter
      .from('USD')
      .to(`${data.currency_type}`)
      .convert(Number(data.amount))
    console.log(result)
    res.json({
      code: 200,
      data: Number(result.toFixed(2)) + ' ' + data.currency_type
    })
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

const getCurrencyDetails = async (from) => {
  return new Promise(async (resolve, reject) => {
    const response = await GET(
      'https://v6.exchangerate-api.com/v6/273237598e0d786583fd4b6d/latest/' +
        from
    )

    console.log(response)

    if (response.result == 'success') {
      resolve(response)
    } else {
      reject(utils.buildErrObject(422, 'Currency Apis not working'))
    }
  })
}

exports.updateCurrencyRates = async (req, res) => {
  try {
    const rate = await getCurrencyDetails('USD')

    await CurrencyRate.create(rate)

    res.json({
      code: 200,
      rate
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCurrencyRates = async (req, res) => {
  try {
    const currencies = await getItemCustom(CurrencyRate, {})

    res.json({
      code: 200,
      data: currencies.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.test = async (req, res) => {
  try {
    /* const r = await Service.find({
       is_active : true
     });
 
     for(var i = 0; i < r.length; i++){
       const val = r[i];
 
       val.known_as = val.slug;
       await val.save()
     }*/

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getReligions = async (req, res) => {
  try {
    const result = await getItemsCustom(Religion, { status: 'active' })

    res.json({
      code: 200,
      data: result.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.updateUserProfile = async (req, res) => {
  try {
    let data = req.body
    delete data.email
    // let last_step = data.step
    // let profile_percentage = data.percentage
    delete data.step
    delete data.percentage
    var model
    if (req.user.role == 'Client') {
      model = User
    } else {
      model = Professional
    }
    item = await updateItem(
      model,
      {
        _id: mongoose.Types.ObjectId(req.user._id)
      },
      {
        $set: data
        /*$max: {
          last_step,
          profile_percentage
        }*/
      }
      /* {
         fields: {
           _id: 1,
           last_step: 1,
           profile_percentage: 1
         },
       },*/
    )
    return res.status(200).json(item)
  } catch (error) {
    handleError(res, error)
  }
}

exports.dbCountries = async (req, res) => {
  try {
    const resp = await getItemsCustom(Country, {})

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.mediaCategories = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    const ip = getIP(req)
    const info = lookup(ip)

    condition['country_details.isoCode'] = info.country.toUpperCase()

    if (data.service_id) {
      condition.service_id = mongoose.Types.ObjectId(data.service_id)
    }

    if (data.service_category_id) {
      condition.service_category_id = mongoose.Types.ObjectId(
        data.service_category_id
      )
    }

    /*

    await MediaCategory.create({
      country_id : "6396c92f7ed594d74974aa4f",
      service_id : "6364beb6ce8120ee9ae89d7f",
      service_category_id : "639dcbc1aa1689e403763e48",
      name : "Boarding Pass",
    })*/

    // const resp = await getItemsCustom(MediaCategory, condition);
    const resp = await aggregateCollection(MediaCategory, [
      {
        $lookup: {
          from: 'countries',
          localField: 'country_id',
          foreignField: '_id',
          as: 'country_details'
        }
      },
      {
        $unwind: {
          path: '$country_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: condition
      }
    ])

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAirlines = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    const ip = getIP(req)
    const info = lookup(ip)

    condition['country_details.isoCode'] = info.country.toUpperCase()

    if (data.service_id) {
      condition.service_id = mongoose.Types.ObjectId(data.service_id)
    }

    if (data.service_category_id) {
      condition.service_category_id = mongoose.Types.ObjectId(
        data.service_category_id
      )
    }

    const resp = await aggregateCollection(Airline, [
      {
        $lookup: {
          from: 'countries',
          localField: 'country_id',
          foreignField: '_id',
          as: 'country_details'
        }
      },
      {
        $unwind: {
          path: '$country_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: condition
      }
    ])

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAirports = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    const ip = getIP(req)
    const info = lookup(ip)

    // condition["country_details.isoCode"] = info.country.toUpperCase()
    if (data.country_id) {
      condition.country_id = mongoose.Types.ObjectId(data.country_id)
    }

    if (data.service_id) {
      condition.service_id = mongoose.Types.ObjectId(data.service_id)
    }

    if (data.service_category_id) {
      condition.service_category_id = mongoose.Types.ObjectId(
        data.service_category_id
      )
    }

    const resp = await aggregateCollection(AirPorts, [
      {
        $lookup: {
          from: 'countries',
          localField: 'country_id',
          foreignField: '_id',
          as: 'country_details'
        }
      },
      {
        $unwind: {
          path: '$country_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: condition
      }
    ])

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAdTypes = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(AdType, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCinemas = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = mongoose.Types.ObjectId(data.country_id)
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(Cinema, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMagazines = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(Magazine, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getReaderShip = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(ReaderShipCategory, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getNewsMagazines = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(NewsPaper, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getRadios = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(Radio, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getTelevisions = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(Television, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getOutOfHome = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    console.log('conditions: ', condition)

    const resp = await getItemsCustom(OutOfHome, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCinemaChainBrand = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(CinemaChainBrand, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getScreenCategories = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(ScreenCategory, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMalls = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MallName, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMoviewTypes = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MovieType, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAdvertisements = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(AdvertisementLanguage, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getUnitMeasurement = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(ServiceUnitMeasurement, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAudienceTypes = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(AudienceType, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getFrequencies = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineFrequency, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getCirculations = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineCirculation, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMagazineLanguages = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineLanguage, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMagazineCategories = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineCategory, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMagazineSubCategories = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const condition = {
      service_category_id: data.mag_category_id
    }

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineSubCategory, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getProfesionals = async (req, res) => {
  try {
    const data = req.query
    const result = await db.getProfesionals(User, data)

    res.json({
      code: 200,
      data: result.list,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getProfesionalDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }
    const result = await db.getProfesionalDetails(User, data)

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.States = async (req, res) => {
  try {
    const data = req.query

    const ip = getIP(req)
    const info = lookup(ip)
    console.log('info: ', info)

    // condition["country_details.isoCode"] = info.country.toUpperCase()

    /* await updateItem(
       Professional,
       {
         _id: mongoose.Types.ObjectId("635cbcce8b551112b2c9ad9a")
       },
       {
         $set: {
           address : null
         },       
       },
     );*/

    const result = await states.getStatesOfCountry(info.country.toUpperCase())

    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.createQuote = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id

    let mediasUrl = []

    if (
      req.files &&
      req.files.attachments &&
      !Array.isArray(req.files.attachments)
    ) {
      let media = await uploadFile({
        file: req.files.attachments,
        path: `${STORAGE_PATH}/quoteAttachments`
      })

      const mimeType = mime.lookup(media)

      mediasUrl.push({
        name: `${STORAGE_PATH_HTTP}/quoteAttachments/${media}`,
        mime: mimeType,
        size: req.files.attachments.size / 1000 // Byte to KB
      })
    } else if (req.files && req.files.attachments) {
      for (let i = 0; i < req.files.attachments.length; i++) {
        let media = await uploadFile({
          file: req.files.attachments[i],
          path: `${STORAGE_PATH}/quoteAttachments`
        })
        const mimeType = mime.lookup(media)
        mediasUrl.push({
          name: `${STORAGE_PATH_HTTP}/quoteAttachments/${media}`,
          mime: mimeType,
          size: req.files.attachments[i].size / 1000 // Byte to KB
        })
      }
    }

    data.attachments = mediasUrl

    const result = await db.createQuote(Quote, data)

    data.quote = result

    // Now create room for same
    data.sender_id = data.user_id
    data.receiver_id = data.professional_id
    const room_data = await db.createRoom(Room, data)
    data.room_data = room_data

    // Now push message to same room
    const message_data = await db.createChatMessage(Chat, data)

    res.json({
      code: 200,
      result
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getRooms = async (req, res) => {
  try {
    const data = req.body

    data.user_id = req.user._id

    const rooms = await db.getRooms(Room, data)

    res.json({
      code: 200,
      data: rooms
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMessages = async (req, res) => {
  try {
    const data = req.query

    data.room_id = req.params.room_id

    data.user_id = req.user._id

    const result = await db.getMessages(Chat, data)

    res.json({
      code: 200,
      messages: result.chats,
      count: result.count
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id

    let mediasUrl = []

    if (
      req.files &&
      req.files.attachments &&
      !Array.isArray(req.files.attachments)
    ) {
      let media = await uploadFile({
        file: req.files.attachments,
        path: `${STORAGE_PATH}/quoteAttachments`
      })

      const mimeType = mime.lookup(media)

      mediasUrl.push({
        name: `${STORAGE_PATH_HTTP}/quoteAttachments/${media}`,
        mime: mimeType,
        size: req.files.attachments.size / 1000 // Byte to KB
      })
    } else if (req.files && req.files.attachments) {
      for (let i = 0; i < req.files.attachments.length; i++) {
        let media = await uploadFile({
          file: req.files.attachments[i],
          path: `${STORAGE_PATH}/quoteAttachments`
        })
        const mimeType = mime.lookup(media)
        mediasUrl.push({
          name: `${STORAGE_PATH_HTTP}/quoteAttachments/${media}`,
          mime: mimeType,
          size: req.files.attachments[i].size / 1000 // Byte to KB
        })
      }
    }

    data.attachments = mediasUrl

    // const result = await db.createQuote(Quote, data);

    // data.quote = result;

    // Now create room for same
    // const room_data = await db.createChatRoom(Room, data);
    data.sender_id = data.user_id
    data.receiver_id = data.professional_id
    const room_data = await db.createRoom(Room, data)
    data.room_data = room_data

    // Now push message to same room
    const message_data = await db.createMessage(Chat, data)

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.sellerBuyerContent = async (req, res) => {
  try {
    const data = req.query

    const sellerContent = (await getItemCustom(SellerContent, {})).data
    const buyerContent = (await getItemCustom(BuyerContent, {})).data

    res.json({
      code: 200,
      sellerContent: sellerContent,
      buyerContent: buyerContent
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getFAQs = async (req, res) => {
  try {
    const data = req.query

    const faqs = await db.getFAQs(Faq, data)

    res.json({
      code: 200,
      data: faqs
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.sendQuoteOffer = async (req, res) => {
  try {
    const data = req.body

    data.user_id = req.user._id

    const quote = (await getItemCustom(Quote, { _id: data.quote_id })).data

    data.quote = quote


    if (!quote) throw buildErrObject(404, 'Quote not found')

    if (quote.professional_id != data.user_id.toString()) {
      throw buildErrObject(409, 'You are not authorised to do it.')
    }

    // if(quote.offer) throw buildErrObject(422, "Already sent offer to this quote")

    const resp = await db.sendQuoteOffer(Quote, data)

    // Now create message
    data.sender_id = quote.user_id
    data.receiver_id = quote.professional_id
    const room_data = await db.createRoom(Room, data)
    data.room_data = room_data

    // Now push message to same room
    const message_data = await createItem(Chat, {
      room_id: data.room_data.room_id,
      primary_room_id: data.room_data._id,
      message: "Here's your Custom Offer",
      message_type: 'offer',
      quote_id: data.quote._id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      date: new Date()
      // attachments : data.attachments,
    })

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getPurposeOfAdvertisement = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(PurposeAdvertisement, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAdsPlacement = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(AdPlacement, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getBidTypes = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(BidType, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getMagazineMedia = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(MagazineMedia, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAdvertiseFormat = async (req, res) => {
  try {
    const data = req.query
    const condition = {}

    if (data.country_id) {
      condition.country_id = data.country_id
    }

    if (data.service_id) {
      condition.service_id = data.service_id
    }

    if (data.service_category_id) {
      condition.service_category_id = data.service_category_id
    }

    const resp = await getItemsCustom(AdvertisementFormat, condition)

    res.json({
      code: 200,
      data: resp.data
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.changeNotificationSetting = async (req, res) => {
  try {
    const data = req.body

  

    const item = await updateItem(
      User,
      {
        _id: mongoose.Types.ObjectId(req.user._id)
      },
      {
        notification_settings: {
          inbox_message: data.inbox_message,
          order_message: data.order_message,
          order_updates: data.order_updates,
          rating_reminder: data.rating_reminder,
          real_time_notifications: data.real_time_notifications,
          sound: data.sound
        }
      },
      {
        upsert: true,
        setDefaultsOnInsert: true
      }
    )

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.sendOfferActivity = async (req, res) => {
  try {
    const data = req.body

    const resp = await db.sendOfferActivity(Quote, data)

    res.json({
      code: 200
      // resp
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.quoteOfferWithdraw = async (req, res) => {
  try {
    const data = req.body

    const result = await db.quoteOfferWithdraw(Quote, data)

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getQuestionList = async (req, res) => {
  try {
    const item = await db.getQuestionList(SecurityQuestion)

    res.json({
      code: 200,
      data: item
    })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.generateTwilioToken = async (req, res) => {
  try {
    const data = req.body

    data.user_id = req.user._id

    data.sender_id = data.user_id
    data.receiver_id = data.receiver_id
    const room_data = await db.createRoom(Room, data)
    data.room_data = room_data

    var room_id = ''
    if (data.room_id) {
      room_id = data.room_id
    } else {
      room_id = uuid.v4()

      // create new entry
      const item = await createItem(VideoRoom, {
        room_id: room_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        primary_room_id: room_data._id
      })

      console.log('Callback-> ', process.env.SERVER_URL + 'users/videoCallback')

      const result = await POST(
        'https://video.twilio.com/v1/Rooms',
        {
          UniqueName: room_id,
          StatusCallback: process.env.SERVER_URL + 'users/video/callback',
          StatusCallbackMethod: 'POST',
          Type: 'peer-to-peer'
        },
        {
          Authorization:
            'Basic ' +
            new Buffer(twilioAccountSid + ':' + twilioAuthToken).toString(
              'base64'
            ),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      )

      item.data.twilio_sid = result.sid
      item.data.twilio_resp = result
      await item.data.save()

      console.log('result -> ', result)
    }

    const identity = req.user.email

    // Create Video Grant
    const videoGrant = new VideoGrant({
      room: room_id
    })

    const senderData = await getItemThroughId(User, data.sender_id)
    const receiverData = await getItemThroughId(User, data.receiver_id)

    // console.log("senderData: ",senderData)

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity: identity }
    )
    token.addGrant(videoGrant)

    // Serialize the token to a JWT string
    console.log(token.toJwt())

    res.json({
      code: 200,
      token: token.toJwt(),
      room_id: room_id,
      senderData: senderData.data,
      receiverData: receiverData.data
    })
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

exports.videoCallback = async (req, res) => {
  try {
    createLogs(req.body)

    const data = req.body

    const room_data = (
      await getItemCustom(VideoRoom, { room_id: data.RoomName })
    ).data

    if (room_data && room_data.room_status != 'completed') {
      room_data.room_status = data.RoomStatus
      await room_data.save()
    } else if (room_data) {
      room_data.room_status = 'completed'
      await room_data.save()
    }

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.audioTokenGenerate = async (req, res) => {
  try {
    var identity = req.user.email

    // identity = nameGenerator();

    const accessToken = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret
    )
    accessToken.identity = identity
    const grant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    })
    accessToken.addGrant(grant)

    // Include identity and token in a JSON response
    /*return {
      identity: identity,
      token: accessToken.toJwt(),
    };*/

    res.json({
      code: 200,
      identity: identity,
      // token : capability.toJwt(),
      data: accessToken.toJwt()
    })

    /* var identity = "alice";
 
     const VoiceGrant = AccessToken.VoiceGrant;
 
     // Create a "grant" which enables a client to use Voice as a given user
     const voiceGrant = new VoiceGrant({
       outgoingApplicationSid: twimlAppSid,
       // pushCredentialSid: "CRfa7928ca0400a59351812986d95e95d9",
       // pushCredentialSid: "IS8e412c77be038ad2e0d0495bff7801b8",
       incomingAllow: true, // Optional: add to allow incoming calls
     });
     const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, {
       identity: identity,
     });
     token.addGrant(voiceGrant);
 
     res.json({
       code: 200,
       identity: identity,
       // token : capability.toJwt(),
       data: token.toJwt(),
     });*/
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

exports.audioVoiceold = async (req, res) => {
  try {
    var callerId = '255'
    const body = req.body
    console.log(body)
    const twiml = new VoiceResponse()
    var toNumber = req.body.To
    // var toNumber = "jeet@mailinator.com";

    /*if (body.RecordingSid) {
      model.callDetail.update(
        {
          record_sid: body.RecordingSid,
          link: body.RecordingUrl,
          duration: body.RecordingDuration,
        },
        {
          where: {
            call_sid: body.CallSid,
          },
        }
      );
    } else {
      model.callDetail.create({
        user_id: body.user_id,
        driver_id: body.agent_id,
        call_sid: body.CallSid,
        to_phone: body.To,
        type: body.type,
        user_type: body.user_type,
      });
    }*/
    if (toNumber) {
      // Wrap the phone number or client name in the appropriate TwiML verb
      // if is a valid phone number
      const attr = (await isAValidPhoneNumber(toNumber)) ? 'number' : 'client'
      const dial = twiml.dial({
        // callerId: "+14303000512",
        callerId: body.outgoing_caller_id,
        record: 'record-from-ringing-dual'
      })
      // dial.number(toNumber);
      /*  const client2 = dial.client();
        client2.identity(toNumber);
        client2.parameter({
            name: body.name,
            outgoing_caller_id: body.outgoing_caller_id,
            profile: body.profile
        });*/
      twiml.record()
      const client2 = dial[attr]({}, toNumber)
      client2.parameter({
        name: body.name,
        outgoing_caller_id: body.outgoing_caller_id,
        profile: body.profile
      })

      console.log(twiml.toString())

      res.send(twiml.toString())
    } else {
      twiml.say('Thanks for calling!')
      console.log('Thanks Calling')
      res.send(twiml.toString())
    }
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

exports.audioVoice = async (req, res) => {
  try {
    var toNumber = req.body.To
    const body = req.body

    if (toNumber) {
      const response = new VoiceResponse()
      const dial = response.dial()
      const client = dial.client()
      client.identity(toNumber)

      client.parameter({
        name: 'name',
        value: body.name
      })
      client.parameter({
        name: 'outgoing_caller_id',
        value: body.outgoing_caller_id
      })

      client.parameter({
        name: 'profile',
        value: body.profile
      })

      res.send(response.toString())
    } else {
      twiml.say('Thanks for calling!')
      console.log('Thanks Calling')
      res.send(twiml.toString())
    }
  } catch (err) {
    console.log(err)
    handleError(res, err)
  }
}

function isAValidPhoneNumber(number) {
  return /^[\d\+\-\(\) ]+$/.test(number)
}

exports.quoteDetails = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const quote = (await getItemCustom(Quote, { _id: data.quote_id })).data

    res.json({
      code: 200,
      data: quote
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.quotePaymentVerify = async (req, res) => {
  try {
    const data = req.body

    await updateItem(
      Quote,
      {
        _id: mongoose.Types.ObjectId(data.quote_id)
      },
      {
        $set: {
          'offer.status': 'accepted',
          'offer.payment_id': data.payment_id
        }
      }
    )

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.checkIfBusy = async (req, res) => {
  try {
    const data = req.query

    data.user_id = req.user._id

    var isBusy = false

    const room = (
      await getItemCustom(Room, {
        $or: [
          {
            sender_id: data.user_id
          },
          {
            receiver_id: data.user_id
          }
        ],
        room_status: 'in-progress'
      })
    ).data

    if (room) {
      isBusy = true
    }

    /*const rooms = await getItemsCustom(Room, {
      $or: [
        {
          sender_id: data.user_id,
        },
        {
          receiver_id: data.user_id,
        },
      ],

    }, "", "", {createdAt : -1}, 10);

    const allRooms = rooms.data

    if(allRooms.length){

      for(var i=0; i< allRooms.length; i++){
        const val = allRooms[i];

        const resp = await client.video.v1.rooms(val.room_id)
        .participants
        .list({status: 'connected', limit: 3});

        // console.log("resp: ",resp)
        // console.log("val.room_id: ",val.room_id)

        if(resp.length > 1){ // User already busy with another call 
          isBusy = true
          break;
        }

      }
      // console.log("resp: ",resp)

    }else{
      isBusy = false
    }*/

    res.json({
      code: 200,
      isBusy: isBusy
      /*data,
      room*/
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getDingProvider = async (req, res) => {
  try {
    const data = matchedData(req)

    console.log('data: ', objectToQueryString(data))
    const query = await objectToQueryString(data)

    const resp = await GET(
      // hit the api using axios
      `${DING_BASE_URL}GetProviders?${query}`,
      {},
      {
        api_key: process.env.DING_API_KEY
      }
    )

    res.json({
      code: 200,
      data: resp
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.dingFindProducts = async (req, res) => {
  try {
    const data = matchedData(req)

    console.log('data: ', objectToQueryString(data))
    const query = await objectToQueryString(data)

    const resp = await GET(
      // hit the api using axios
      `${DING_BASE_URL}GetProducts?${query}`,
      {},
      {
        api_key: process.env.DING_API_KEY
      }
    )

    res.json({
      code: 200,
      data: resp
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.ServiceHeader = async (req, res) => {
  try {
    const condition = {}
    condition.is_active = true
    condition.known_as = {
      $in: [
        'advertising',
        'cleaning_services',
        'death_care',
        'professional_services',
        'mobile_telecommunications',
        'wedding'
      ]
    }
    const resp = (await getItemsCustom(Service, condition)).data

    res.json({
      code: 200,
      data: resp
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getAllServicesList = async (req, res) => {
  try {
    const data = req.query
    const item = await db.getAllServicesList(Service, data)
    return res.status(200).json(item)
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.findNearestServices = async (req, res) => {
  try {
    const data = req.body
    const item = await db.findNearestServices(ProfessionalService, data)
    return res.status(200).json(item)
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.createNotification = async (req, res) => {
  try {
    const data = req.body
    console.log('*********', data)
    const item = await createItem(Notification, data)
    return res.status(200).json(item)
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.deleteNotification = async (req, res) => {
  try {
    const data = req.params
    const item = await updateItemThroughId(
      Notification,
      data.notification_id,
      {
        is_seen: true
      },
      {
        fields: {
          _id: 1
        }
      }
    )
    // const item = await deleteItem(Notification,data.notification_id);
    return res.status(200).json(item)
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.getNotification = async (req, res) => {
  try {
    const data = req.query

    data.user_id = req.user._id

    console.log('data: ', data)

    const resp = await db.getNotification(Notification, data)

    // const item = await getItemCustom(Notification);
    return res.status(200).json({
      code: 200,
      data: resp.list,
      count: resp.count
    })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

// exports.getUserLocation = async(req,res)=>{
//   try{
//     const data = req.query
//      const ip = getIP(req);
//     const info = lookup(ip);
//     console.log("info: ", info)
//     const item = await User.find({
//       $near:{
//         $geometry:{
//           Type:"Point",
//           coordinates:[]
//         },
//         $maxDistance:
//         $minDistance:
//       }
//     })
//     return res.status(200).json("item")
//   }catch(error){
//     console.log(error)
//     handleError(res,error)
//   }
// }

exports.bookingStatus = async (req, res) => {
  try {
    const data = req.body
    // data.user_id = req.user._id
    let locale = req.getLocale()
    const item = await getItemThroughId(User, req.user._id)
    if (item.success == true) {
      let mailOptions = {
        to: item.data.email,
        subject: `Switch Account Response`,
        name: `${capitalizeFirstLetter(
          item.data.first_name
        )} ${capitalizeFirstLetter(item.data.last_name)}`,
        permission: 'test'
      }
      emailer.sendEmail(locale, mailOptions, 'admin/switchPermissionEmail')
    }
    return res.status(200).json(item)
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.createRatingAndReview = async (req, res) => {
  try {
    const data = req.body

    const booking = (
      await getItemCustom(ServiceBooking, {
        _id: data.service_booking_id
      })
    ).data

    if (!booking) throw buildErrObject(404, 'Booking not found')

    const isAlreadyGivenProRating = (
      await getItemCustom(ProfessionalRating, {
        user_id: req.user._id,
        professional_id: booking.professional_id
      })
    ).data

    const isAlreadyGivenBookRating = (
      await getItemCustom(ProfessionalRating, {
        service_booking_id: data.service_booking_id
      })
    ).data

    if (!isAlreadyGivenProRating) {
      const item = await createItem(ProfessionalRating, {
        user_id: req.user._id,
        rating: data.professional_rating,
        review: data.review,
        professional_id: booking.professional_id
      })
    } else {
      isAlreadyGivenProRating.rating = data.professional_rating
      isAlreadyGivenProRating.review = data.review
      await isAlreadyGivenProRating.save()
    }

    if (!isAlreadyGivenBookRating) {
      const item = await createItem(BookingRating, {
        user_id: req.user._id,
        rating: data.rating,
        review: data.review,
        service_booking_id: data.service_booking_id
      })
    }

    return res.status(200).json({
      code: 200
    })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.getProfessionalRatings = async (req, res) => {
  try {
    const data = {
      ...req.query,
      ...req.params
    }

    const resp = await db.getProfessionalRatings(ProfessionalRating, data)

    const avg = await aggregateCollection(ProfessionalRating, [
      {
        $group: {
          _id: '$_id',
          avgRating: { $avg: '$rating' }
        }
      }
    ])

    res.json({
      code: 200,
      data: resp.list,
      count: resp.count,
      averageRating: avg.data.length ? avg.data[0].avgRating : 0
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.likeDislike = async (req, res) => {
  try {
    const data = {
      ...req.body,
      ...req.params
    }

    data.user_id = req.user._id

    const rating = (
      await getItemCustom(ProfessionalRating, {
        _id: data.rating_id,
        'like_dislikes.user_id': data.user_id
      })
    ).data
    const ratingTemp = (
      await getItemCustom(ProfessionalRating, { _id: data.rating_id })
    ).data

    // const isLikeDislike = rating.like_dislikes.find(item => item.user_id == data.user_id)

    // console.log(rating.like_dislikes)

    if (!rating) {
      ratingTemp.like_dislikes.push({
        status: data.status,
        user_id: data.user_id
      })
      ratingTemp.markModified('like_dislikes')
      await ratingTemp.save()
    } else {
      await updateItem(
        ProfessionalRating,
        {
          _id: mongoose.Types.ObjectId(data.rating_id),
          'like_dislikes.user_id': data.user_id
        },
        {
          $set: {
            'like_dislikes.$.status': data.status
          }
        },
        {}
      )
    }

    res.json({
      code: 200
    })

    /* var result;
     const getrating = (await getItemCustom(ProRatingLikeDislike, { user_id: req.user._id, rating_id: data.rating_id })).data
     if (getrating) {
       result = await updateItemThroughId(ProRatingLikeDislike, getrating._id, { is_like: data.is_like });
     } else {
       data.user_id = req.user._id,
         data.rating_id = data.rating_id
       result = await createItem(ProRatingLikeDislike, data);
     }
     return res.status(200).json(result);*/
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.addFCMDevice = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id

    const isDeviceExist = (
      await getItemCustom(FCMDevice, {
        user_id: data.user_id,
        device_id: data.device_id,
        device_type: data.device_type
      })
    ).data

    if (isDeviceExist) {
      // update the token

      isDeviceExist.token = data.token
      await isDeviceExist.save()
    } else {
      //add the token
      // console.log(data)
      const item = await createItem(FCMDevice, data)
    }

    res.json({
      code: 200
    })
  } catch (err) {
    handleError(res, err)
  }
}

exports.deleteFCMDevice = async (req, res) => {
  try {
    const data = req.body
    data.user_id = req.user._id
    var result
    const isDeviceExist = (
      await getItemCustom(FCMDevice, {
        user_id: data.user_id,
        device_id: data.device_id,
        device_type: data.device_type
      })
    ).data
    if (isDeviceExist) {
      result = await deleteItem(FCMDevice, isDeviceExist._id)
    }
    res.json({
      code: 200,
      data: result
    })
  } catch (err) {
    handleError(res, err)
  }
};

