const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const ClientSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    full_address: [
      {
        address: { type: String },
        postalCode: { type: String },
        town: { type: String },
        city: { type: String },
        latitude: {
          type: String,
        },
        longitude: {
          type: String,
        },
      },
    ],
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    address: {
      type: String,
    },
    address1: {
      type: String,
    },
    address2: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    town: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "EMAIL_IS_NOT_VALID",
      },
      lowercase: true,
      // required: true
    },
    visible: {
      type: Boolean,
      default: false,
    },

    is_active: {
      type: Boolean,
      default: true,
    },
    mustSignRepair: {
      type: Boolean,
      default: false,
    },
    mustProvidePurchase: {
      type: Boolean,
      default: false,
    },
    appointmentDateTime: {
      type: Date,
    },
    appointmentNote: {
      type: String,
    },
    vatCharge: {
      type: Boolean,
      default: false,
    },
    vatCurreny: {
      type: String,
    },
    vatPercent: {
      type: mongoose.ObjectId,
      ref: "vatRate",
    },
    accountNumber: {
      type: Number,
    },
    productRange: {
      type: Number,
    },
    productDescription: {
      type: String,
    },
    productQuantity: {
      type: Number,
    },
    productPrice: {
      type: Number,
    },
    productTax: {
      type: Number,
    },
    stripeCustomerId: {
      type: String,
    },

    serviceList: [
      {
        productRange: {
          type: Number,
        },
        productDescription: {
          type: String,
        },
        productQuantity: {
          type: Number,
        },
        productPrice: {
          type: Number,
        },
        productTax: {
          type: Number,
        },
      },
    ],
    productTotalAmount: {
      type: Number,
    },
    dspPercent: {
      type: Number,
    },
    clientType: {
      type: String,
      enum: ["individual", "pro"],
      default: "individual",
    },
    hailDiscount: {
      type: Boolean,
      default: false,
    },
    transferQuotes: {
      type: Boolean,
      default: false,
    },
    latitude: {
      type: String,
    },
    longitude: {
      type: String,
    },
    profileImg: {
      type: String,
    },
    vatN: {
      type: String,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Client", ClientSchema);
