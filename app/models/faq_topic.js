const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const FAQTopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    is_active: {
      type: Boolean,
      default: true
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)

FAQTopicSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('FaqTopic', FAQTopicSchema)
