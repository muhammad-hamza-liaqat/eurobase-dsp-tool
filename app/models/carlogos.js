const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const carLogo = new mongoose.Schema(
  {
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'carLogos'
    },
    category_title: {
      type: String
    },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'carLogos' }],
    carmodel: [
      {
        type: String
      }
    ],
    main_title: {
      type: String
      // required: true
    },
    sub_title: {
      type: String
      // required: true
    },
    logo: {
      type: String
      // required: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

carLogo.plugin(mongoosePaginate)
module.exports = mongoose.model('carLogos', carLogo)
