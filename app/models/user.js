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
    company_logo: {
      type: String,
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "EMAIL_IS_NOT_VALID",
      },
      lowercase: true,
      required: false,
    },
    secondary_emails: [
      {
        email: { type: String },
        status: {
          type: String,
          enum: ["active", "inactive"],
          default: "active",
        },
        verification_status: { type: Boolean, default: false },
        verificationOTP: { type: String },
      },
    ],
    phone_number: {
      type: String,
    },
    siret_number: {
      type: String,
      // unique: true,
    },
    emailVerificationOTP: { type: String },
    unverifiedEmail: { type: String },
    phone_OTP: {
      type: Number,
    },
    password_filled: {
      type: Boolean,
      default: true,
    },
    otp_expire_time: {
      type: Date,
    },
    profile_image: {
      type: String,
    },
    social_id: {
      type: String,
    },
    social_type: {
      type: String,
      enum: ["email", "google", "facebook", "apple"],
      default: "email",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    created_via: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    totalEmployees: {
      type: Number,
      default: 0,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    password: {
      type: String,
      select: false,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    first_login: {
      type: Date,
    },
    last_login: {
      type: Date,
    },
    zipcode: {
      type: String,
    },
    payment_status: {
      type: Boolean,
      default: false,
    },
    profile_img: {
      type: String,
    },
    company_logo: {
      type: String,
    },
    subscription_plan: {
      type: mongoose.ObjectId,
      ref: "subscriptions",
    },
    planActivationDate: { type: Date },
    remaningDays: { type: Number },
    planDuration: { type: Number },
    trialPeriod: {
      type: Boolean,
      default: true,
    },
    super_admin_allowance: {
      type: Boolean,
      default: false,
    },
    verification_status: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
    },
    fcmTokens: [
      {
        device_id: {
          type: String,
          required: true,
        },
        token: {
          type: String,
          required: true,
        },
        device_type: {
          type: String,
          required: true,
        },
      },
    ],
    full_address: {
      type: Object,
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
