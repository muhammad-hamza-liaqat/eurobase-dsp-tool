const mongoose = require('mongoose')
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const insuredPerson = new mongoose.Schema(
    {
        first_name: String,
        last_name: String,
        Address: String,
        Additional_Address: String,
        Additional_Address2: String,
        pincode: String,
        Telephone: String,
        email: {
            type: String,
            // unique: true
        },
        garage_name: {
            type: String
        },
        client_id: {
            type: mongoose.ObjectId
        },
        garage_user_id:{
            type: mongoose.ObjectId
        },
        // garage_id:{
        //     type: mongoose.ObjectId
        // }
    },
    {
        versionKey: false,
        timestamps: true
    },

);




module.exports = mongoose.model('insuredPerson', insuredPerson)
