const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')


const freeQuotesSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.ObjectId,
      ref: "Client"
    },
    garage_user_id: {
      type: mongoose.ObjectId,
      ref: "User"
    },
    techniciansId: {
      type: mongoose.ObjectId,
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
         ref:"sub_user"
        },
        totalHT: String,
        comment: String,
        discount: Number,
      }
    ],
    regNumber:String,
   car: {
      type:mongoose.ObjectId,
      ref:"carLogos"
    },
    carModel:String,
    date:Date,
    draft: {
      type: Boolean,
      default: false
    },
    color:String
  },
  {
    versionKey: false,
    timestamps: true
  }
)



module.exports = mongoose.model('freeQuotes', freeQuotesSchema)
