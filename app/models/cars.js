const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const carsSchema = new mongoose.Schema(
  {
    logo: {
      type: String
    },
    brand_name: {
      type: String
    },
    model: [{
      category_name: {
        type: String,
      },
      type: {
        type: [String],
      },
    }],
  },
  {
    versionKey: false,
    timestamps: true
  }
)

carsSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('cars', carsSchema)
