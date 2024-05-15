const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const CMSSchema = new mongoose.Schema(
  {
    title_1: {
      type: String,
    },
    title_2: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['privacy_policy', 'terms', 'about','contact'],
    },
    about_img_1:{
      type: String,
    },
    about_img_2:{
      type: String,
    },
    title_first:{
      type: String,
    },
    first_para:{
      type: String,
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)

CMSSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('CMS', CMSSchema)
