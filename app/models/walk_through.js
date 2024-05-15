const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const WalkThroughSchema = new mongoose.Schema(
    {
      title: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true
      },
      image: {
        type: String,
        required: true
      },
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  
  WalkThroughSchema.plugin(mongoosePaginate)
  module.exports = mongoose.model('WalkThrough', WalkThroughSchema)