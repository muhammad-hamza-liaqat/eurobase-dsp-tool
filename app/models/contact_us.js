const mongoose = require("mongoose");
// const validator = require('validator')
const mongoosePaginate = require("mongoose-paginate-v2");

const ContactUsSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    phone: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "complete"],
      default: "pending",
    },
    address: {
      type: String,
    },
    message: {
      type: String,
      default: null,
    },
    subject: {
      type: String,
      default: null,
    },
    reply: {
      type: String,
      default: null,
    },
    login_token: {
      type: String,
    },
    request: {
      type: String,
      default: "pending",
      enum:["pending","sent","accept","reject"]
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

ContactUsSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("ContactUs", ContactUsSchema);
