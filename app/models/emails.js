const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const EmailSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      required: true
    },
    type:{
      type:String,
      default:"Primary"
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

EmailSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('emails', EmailSchema)
