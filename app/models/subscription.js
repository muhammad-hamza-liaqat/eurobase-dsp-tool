const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    plan_name: {
      type: String,
    },
    price: {
      type: Number,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number,
    },
    features: {
      type: String,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("subscriptions", subscriptionSchema);
