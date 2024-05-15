const mongoose = require("mongoose");
const calendarSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
    },
    date: Date,
    time: { type: String },
    client_id: {
      type: mongoose.ObjectId,
      ref: "Client",
    },
    schedule_status: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "rescheduled"],
    },
    firstName: String,
    lastName: String,
    model: String,
    licensePlate: String,
    status: String,
    duration: String,
    vehicleStatus: String,
    RepairType: String,
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("calendar", calendarSchema);
