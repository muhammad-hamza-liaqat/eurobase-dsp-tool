const mongoose = require('mongoose')
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
// const { STRING } = require('sequelize');

const SubUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.ObjectId,
            ref: "User",
        },
        image: String,
        Service_Name: String,
        price: String,
        status:{
            type:Boolean,
            default:false
        }
       
    },
    {
        versionKey: false,
        timestamps: true
    },

);


module.exports = mongoose.model('services', SubUserSchema)
