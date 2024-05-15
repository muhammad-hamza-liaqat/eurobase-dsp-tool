const mongoose = require("mongoose");

const aboutUsOtherSchema = new mongoose.Schema(
  {
    icon: {
      type: String,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    designation: {
      type: String,
    },
    type: {
      type: String,
      enum: ["why_choose_us", "what_our_client_say","our_services"],
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
);

module.exports = mongoose.model("AboutUsOtherSchema", aboutUsOtherSchema);
