const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const UserAddressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      number: {
        type: String
      },
      country_code: {
        type: String
      }
    },
    address: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    state: {
      type: String
    },
    city: {
      type: String
    },
    is_default: {
      type: Number,
      default: 1
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

UserAddressSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserAddress', UserAddressSchema)
