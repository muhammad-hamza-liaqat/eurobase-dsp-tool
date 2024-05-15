const { Schema, model } = require('mongoose')

const VatSchema = new Schema(
  {
    country_name: { required: true, type: String },
    vat_rate: { required: true, type: Number }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

const vatRate = model('vatRate', VatSchema)
module.exports = vatRate
