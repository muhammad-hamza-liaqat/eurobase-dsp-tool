const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const TestSchema = new mongoose.Schema(
    {
      title: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true
      },
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  
  TestSchema.plugin(mongoosePaginate)
  module.exports = mongoose.model('Test', TestSchema)