const mongoose = require('mongoose')

const quoteSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.ObjectId,
      ref: "Client"
    },
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    color: {
      type: String,
    },
    regNumber: {
      type: String,
    },
    wine: {
      type: String,
    },
    voNumber: {
      type: String,
    },
    draft: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
    },
    paintType: {
      type: String,
    },
    rimsType: {
      type: String,
    },
    optionVo: {
      voNumber: String,
      customerOrderNUmber: String,
    },
    hailOption: {
      type :Boolean,
      default:false
    },
    invoiceNumber:{
      type: String,
    },
    insurance: [
      {
        company_id: {
          type:  mongoose.ObjectId,
          ref:"insurence"
        },
        tax: {
          type: String
        },
        amount_offered: {
          type: String
        },
        company_name:{
          type: String
        }
      }
    ],
    

    courtesy: {
      type: Boolean,
      default: false
    },
    type_of_car:{
      type:mongoose.ObjectId,
      ref:"carLogos"
    },
    // regNumber:String,
    model:{
      // type:mongoose.ObjectId
      type:String
    },
    insured_person:{
      type:mongoose.ObjectId,
      ref:"insuredPerson"
    },
    technicians:[
      {
        type:mongoose.ObjectId,
        ref:"sub_user"
      },
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
    InvoiceStatus: {
      type: Boolean,
      default: false
    },
    total_amount: {
      type: Number,
    },
    expert:[
      {
        type:mongoose.ObjectId,
         ref:"sub_user"
      },
    ]
  },
  {
    versionKey: false,
    timestamps: true
  },

);


module.exports = mongoose.model('quotes', quoteSchema)
