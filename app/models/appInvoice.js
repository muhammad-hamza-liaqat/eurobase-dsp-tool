const mongoose = require('mongoose')

const AppInvoiceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true
    },

    status: {
      type: String,
      enum: ['unpaid', 'fully_paid', 'failed'],
      default: 'unpaid'
    },
    paid_amount: { type: Number, default: 0 },
    transaction_id: { type: String },
    payment_date: { type: Date },
    currency: String
  },
  {
    versionKey: false,
    timestamps: true
  }
)

module.exports = mongoose.model('AppInvoice', AppInvoiceSchema)
