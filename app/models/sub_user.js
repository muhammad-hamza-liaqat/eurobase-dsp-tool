const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const SubUserSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    image: {
      type: String
    },
    store_id: {
      type: mongoose.ObjectId,
      ref: 'Store'
      // required: true,
    },
    user_type: {
      type: String,
      enum: [
        'body_work_subcontractor',
        'body',
        'super_user',
        'bodywork_team',
        'body_repairer',
        'expert',
        'super_admin'
      ]
    },
    sub_contractor_discount: {
      type: String
    },
    View_A_Quote: {
      type: Boolean,
      default: false
    },
    quote: {
      type: Boolean,
      default: false
    },
    Access_To_Invoice: {
      type: Boolean,
      default: false
    },
    create_customers: {
      type: Boolean,
      default: false
    },
    Access_the_calendar: {
      type: Boolean,
      default: false
    },
    Access_The_profile: {
      type: Boolean,
      default: false
    },
    Access_The_FreeQuote: {
      type: Boolean,
      default: false
    },
    Access_The_CarList:{
      type: Boolean,
      default: false
    },
    Access_The_UserAuthorization:{
      type: Boolean,
      default: false
    },
    change_price:{
      type: Boolean,
      default: false
    },
    create_repair_order:{
      type: Boolean,
      default: false
    },
    is_active: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    access_the_workshop_schedule: {
      type: Boolean,
      default: false
    },
    first_name: {
      type: String
    },
    last_name: {
      type: String
    },
    phone_number: {
      type: Number
    },
    email: {
      type: String,
      required: false
    },
    password: {
      type: String,
      select: false
    },
    decoded_password: {
      type: String
    },
    initials: {
      type: String
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, null, (error, newHash) => {
    if (error) {
      return next(error)
    }
    user.password = newHash
    return next()
  })
}

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err)
    }
    return hash(user, salt, next)
  })
}

SubUserSchema.pre('save', function (next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

SubUserSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}

SubUserSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('sub_user', SubUserSchema)
