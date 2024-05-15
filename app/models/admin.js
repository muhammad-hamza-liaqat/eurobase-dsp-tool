const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

// const subPrivileges = {
//   add: {
//     type: Boolean,
//     default: false
//   },
//   edit: {
//     type: Boolean,
//     default: false
//   },
//   view: {
//     type: Boolean,
//     default: false
//   },
//   delete: {
//     type: Boolean,
//     default: false
//   }
// }

const AdmimSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: 'EMAIL_IS_NOT_VALID'
      },
      lowercase: true,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true,
      // select: false
    },
    decoded_password: {
      type: String,
      // select: false
    },
    is_active: {
      type: Boolean,
      default: true
    },
    verification: {
      type: String
    },
    verified: {
      type: Boolean,
      default: false
    },
    phone: {
      type: Object
    },
    address: {
      country: String,
      state: String,
      city: String,
      zipcode:String
    },
    fcmTokens: [
      {
        device_id: {
          type: String,
          required: true,
        },
        token: {
          type: String,
          required: true,
        },
        device_type: {
          type: String,
          required: true,
        },
      },
    ],
    role: {
      type: String,
      enum: ['superAdmin'],
      default: 'superAdmin'
    },
    // privileges: {
    //   user_management: subPrivileges,
    //   professional_management: subPrivileges,
    //   cms_management: subPrivileges,
    //   faqs_management: subPrivileges,
    //   faqs_topic_management: subPrivileges,
    //   services_management: subPrivileges,
    //   product_category_management: subPrivileges,
    //   product_sub_category_management: subPrivileges,
    //   services_management: subPrivileges,
    //   blogs_management: subPrivileges,
    // },
    profile_img: {
      type: String
    },
    description:{
      type: String
    },
    instagramUrl: {
      type: String
    },
    twitterUrl:{
      type: String
    },
    facebookUrl:{
      type: String
    },
    
    // service_id : {
    //   type : mongoose.ObjectId,
    //   ref : "Service"
    // },
    // service_category_id : {
    //   type : mongoose.ObjectId,
    //   ref : "ServiceCategory"
    // },
    // service_sub_category_id : {
    //   type : mongoose.ObjectId,
    //   ref : "ServiceSubCategory"
    // },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    blockExpires: {
      type: Date,
      default: Date.now,
      select: false
    },
    someone_follows_me: {
      type:Boolean,
      default:false
    },
    someone_answer_on_post: {
      type:Boolean,
      default:false
    },
    someone_mention_me: {
      type:Boolean,
      default:false
    },
    new_launches_projects: {
      type:Boolean,
      default:false
    },
    monthly_product_updation: {
      type:Boolean,
      default:false
    },
    subscribe_newsletter: {
      type:Boolean,
      default:false
    },
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
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

AdmimSchema.pre('save', function (next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

AdmimSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}

AdmimSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Admin', AdmimSchema)
