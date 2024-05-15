const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const CountrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    isoCode: {
      type: String,
      required: true
    },
    flag: {
      type: String,
      required: true
    },
    phonecode: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    latitude: {
      type: String,
      required: true
    },
    longitude: {
      type: String,
      required: true
    },
    timezones: Array
  },
  {
    versionKey: false,
    timestamps: true
  }
)

CountrySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Country', CountrySchema)
