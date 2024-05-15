const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const TodoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ['completed', 'pending'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['High', 'Normal', 'Low']
    },
    date: {
      type: String
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

TodoSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Todo', TodoSchema)
