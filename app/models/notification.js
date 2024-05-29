const mongoose = require("mongoose");
// const validator = require('validator')
const mongoosePaginate = require("mongoose-paginate-v2");

const NotificationSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    receiver_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    typeId: {
      type: String,
    },
    value_id: {
      type: mongoose.Types.ObjectId,
    },
    title: {
      type: String,
      required: true,
    },
    objectName: {
      type: String,
    },
    notification_type: {
      type: String,
      enum: [
        "bookings",
        "approval",
        "create_account",
        "disapproved",
        "create_booking",
        "create_service",
        "cancelled",
        "rejected",
        "Permission Request",
        "contact",
        "car",
        "Subscription Plan",
        "receive_payment"
      ],
      required: true,
    },
    permissionRequestStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "decline"],
    },
    role: {
      type: String,
      enum: ["Client", "Professional"],
      default: "Client",
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
    },
    is_seen: {
      type: Boolean,
      default: false,
    },
    is_admin: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

NotificationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Notification", NotificationSchema);
