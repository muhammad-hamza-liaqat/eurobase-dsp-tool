const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const insurence = new mongoose.Schema(
  {
    insurance_name: String,
    company_name: String,
    status: { type: String, default: 'active', enum: ['active', 'inactive'] }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

module.exports = mongoose.model('insurence', insurence)
