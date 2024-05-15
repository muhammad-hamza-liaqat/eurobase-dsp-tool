const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const main_model = new mongoose.Schema(
    {
      main_logo_id: {
        type: mongoose.Types.ObjectId,
        required: true
      },
      main_title:{
        type:String
      },
      model: {
        type: String,
        required: true
      },
      user_id:{
        type: mongoose.Types.ObjectId,
        // required: true
      }
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  
  main_model.plugin(mongoosePaginate)
  module.exports = mongoose.model('car_main_models', main_model)