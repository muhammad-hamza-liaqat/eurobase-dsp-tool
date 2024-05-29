// const mongoose = require("mongoose");
// const mongoosePaginate = require("mongoose-paginate-v2");

// const EmailFollowUpSchema = new mongoose.Schema(
//   {
//     user_id: {
//       type: mongoose.ObjectId,
//       ref: "User",
//     },
//     message: {
//       type: String,
//       required: true,
//     },
//     client_id:{
//         type: mongoose.ObjectId,
//         ref:'Client',
//     },
//     status: { type: Boolean, default: false },
//   },
//   {
//     versionKey: false,
//     timestamps: true,
//   }
// );

// EmailFollowUpSchema.plugin(mongoosePaginate);
// module.exports = mongoose.model("EmailFollowUp",EmailFollowUpSchema);


const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const EmailFollowUpSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      required: true,
    },
    client_id:{
      type: mongoose.ObjectId,
      ref:'Client',
    },
    recipients: [{ type: String, required: true }], // Array of recipient emails
    status: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

EmailFollowUpSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("EmailFollowUp", EmailFollowUpSchema);
