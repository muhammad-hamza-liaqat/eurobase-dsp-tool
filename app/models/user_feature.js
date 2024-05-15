const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')


const userFeatureSchema = new mongoose.Schema(
  {
    quote: {
      type: Boolean,
      default:true
    },
    access_the_calendar: {
      type: Boolean,
      default:true
    },
    access_the_workshop: {
      type: Boolean,
      default:true
    },
    make_invoices: {
      type: Boolean,
      default:true
    },
    create_customers: {
      type: Boolean,
      default:true
    },
    create_repair_order: {
      type: Boolean,
      default:true
    },
    name: String,
  }   
)



module.exports = mongoose.model('userFeature', userFeatureSchema)
