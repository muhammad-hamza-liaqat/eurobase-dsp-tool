const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const ClickSchema = new mongoose.Schema(
  {
    totalClicks: {
      type: Number,
      default: 0
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

ClickSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Clicks', ClickSchema)
