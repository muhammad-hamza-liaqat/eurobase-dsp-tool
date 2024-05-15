const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const RoomSchema = new mongoose.Schema(
  {
    room_id: {
      type: String,
      required: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    last_message: {
      type: String,
      default: null,
    },
    notes: [
      {
        note: {
          type: String,
          default: null,
        },
        user_id: {
          type: mongoose.ObjectId,
          default: null,
        },
      },
    ],
    room_type: {
      type: Number,
      default: 0, // 0 => individual, 1 => Group
    },
    is_saved: [
      {
        // we will push if we user saved this conversation
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    seen_users: [
      {
        // we will push if seen
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    block: [
      {
        blocked_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        blocked_to: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    deletedAt: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    archive: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    read: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    starred: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
RoomSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Room", RoomSchema);
