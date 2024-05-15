const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const { ObjectID } = require("bson");

const UserSchema = new mongoose.Schema(
  {
    
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    company_name: {
      type: String,
    },
    company_logo:{
      type: String,
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "EMAIL_IS_NOT_VALID",
      },
      lowercase: true,
      unique: true,
      required: false,
    },
    phone_number: {
      type: String,
      unique: true,
      // required: true,
    },
    siret_number: {
      type: String,
      // unique: true,
      required: true,
    },
    phone_OTP : {
      type: Number
    },
    otp_expire_time : {
      type: Date,
    },
    profile_image: {
      type: String,
    },
    social_account: [],

    social_id: {
      type: String,
    },
    login_type: {
      type: String,
      enum: ["email", "google", "facebook", "apple"],
      default: "email",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // loginAttempts: {
    //   type: Number,
    //   default: 0,
    //   select: false,
    // },
    // blockExpires: {
    //   type: Date,
    //   default: Date.now,
    //   select: false,
    // },
    stripe_customer_id :{
      type: String
    },
    phone_OTP : {
      type: Number
    },
    email_OTP : {
      type: Number
    },
    isArtist : {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      // required: true,
      select: false,
    },
    isProfileComplete : {
      type: Boolean,
      default: false
    },
    is_email_verified : {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, null, (error, newHash) => {
    if (error) {
      return next(error);
    }
    user.password = newHash;
    return next();
  });
};

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err);
    }
    return hash(user, salt, next);
  });
};

UserSchema.pre("save", function (next) {
  const that = this;
  const SALT_FACTOR = 5;
  if (!that.isModified("password")) {
    return next();
  }
  return genSalt(that, SALT_FACTOR, next);
});


UserSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  );
};

UserSchema.plugin(mongoosePaginate);
// UserSchema.virtual("addresses", {
//   ref: "UserAddress",
//   localField: "_id",
//   foreignField: "user_id",
//   justOne: false,
// });
module.exports = mongoose.model("User", UserSchema);
