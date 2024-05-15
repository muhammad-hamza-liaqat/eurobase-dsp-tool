const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    description: { type: String },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accept", "decline"],
    },
    type: { type: String, enum: ["Send", "Get"] },
    requestType: { type: String, enum: ["Car"] },
    requestId: { type: mongoose.ObjectId, ref: "carlogos" },
    requestName: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);
module.exports = mongoose.model("Request", RequestSchema);
