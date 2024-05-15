const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ChatSchema = new mongoose.Schema(
  {
    room_id: {
      type: String,
      required: true,
    },
    primary_room_id: {
      type: mongoose.ObjectId,
      ref: "Room"
    },
    message: {
      // will be save only message
      type: String,
    },

    message_type: {
      type: String,
      enum: ["text", "media", "quote", "offer","resolution","request_decline","order_cancelled","request_cancelled","request_update_cancelled","update_order","cancel_order","response"],
      default: "text",
    },

    is_dispute_message: {
      type: Boolean,
      default: false
    },

    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
    },

    room_type: {
      type: Number,
      default: 0, // 0 => individual, 1 => Group
    },

    seen: {
      type: Boolean,
      default: false,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: "User",
    },

    dispute_message_request:{
      type:String,
      enum: ['pending','request_inprogress','buyer_can_text'],
      default: 'pending'
    },

    unique_id: {
      type: String,
      default: null,
    },

    dispute: {
      type: Object
    },

    /*attachment_name: {
      // add when message_type == 'media'
      type: String,
      default: null,
    },*/

    attachments: [{
      // add when message_type == 'media'
      name: String,
      mime: String,
      size: String,
      url: String,
    }],

    quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
    },

    is_Delete_from_sender: {
      type: Boolean,
      default: false
    },

    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
    },

    /* attachment_size: {
       // add when message_type == 'media'
       type: Number,
       default: 0,
     },*/

    /* mimeType: {
       // add when message_type == 'media'
       type: String,
       default: null,
     },*/

    date: {
      type: Date,
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: "User",
    },
    clearChat: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    deletedAt: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    unread: [
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
ChatSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Chat", ChatSchema);
