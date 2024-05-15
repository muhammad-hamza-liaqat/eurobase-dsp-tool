const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const freeQuotesInvoiceSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.ObjectId,
      ref: 'Client'
    },
    user_id: {
      type: mongoose.ObjectId,
      ref: 'User'
    },
    quotation_id: {
      type: mongoose.ObjectId,
      ref: 'freeQuotes'
    },
    parts: [
      {
        quantity: Number,
        description: String,
        choice: String,
        discount: Number,
        ht: Number
      }
    ],

    technician: [
      {
        techniciansId: {
          type: mongoose.ObjectId,
          ref: 'sub_user'
        },
        totalHT: String,
        comment: String,
        discount: Number
      }
    ],
    invoiceNumber: String,
    car: {
      type: mongoose.ObjectId,
      ref: 'carLogos'
    },
    carModel: String,
    date: Date,
    currency: String,
    draft: {
      type: Boolean,
      default: false
    },
    color: String,
    total: String
  },
  {
    versionKey: false,
    timestamps: true
  }
)

module.exports = mongoose.model('InvoicefreeQuotes', freeQuotesInvoiceSchema)
