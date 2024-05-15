const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const { ObjectID } = require("bson");

const StoreSchema = new mongoose.Schema(
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
    is_active: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
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
      // unique: true,
      // required: true,
    },
    admin_id: {
      type: mongoose.Types.ObjectId
    },
    siret_number: {
      type: String,
      // unique: true,
      // required: true,
    },
    password: {
      type: String,
      // required: true,
      select: false,
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

StoreSchema.pre("save", function (next) {
  const that = this;
  const SALT_FACTOR = 5;
  if (!that.isModified("password")) {
    return next();
  }
  return genSalt(that, SALT_FACTOR, next);
});


StoreSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  );
};

StoreSchema.plugin(mongoosePaginate);
// UserSchema.virtual("addresses", {
//   ref: "UserAddress",
//   localField: "_id",
//   foreignField: "user_id",
//   justOne: false,
// });
module.exports = mongoose.model("Store", StoreSchema);
