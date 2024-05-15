const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.ObjectId,
      ref: "Client",
    },
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
    },
    invoiceNumber: {
      type: String,
    },
    regNumber: {
      type: String,
    },
    draft: {
      type: Boolean,
      default: false,
    },
    sendDate: {
      type: Date,
    },
    reminderDate: {
      type: Date,
    },
    createdDate: {
      type: Date,
    },
    technicianId: {
      type: mongoose.ObjectId,
    },
    parts: {
      type: Array,
    },
    total: {
      type: String,
    },
    balance: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["unpaid", "partially_paid", "fully_paid"],
      default: "unpaid",
    },
    quotation_id: {
      type: mongoose.ObjectId,
      ref: "quotes",
    },
    free_quotation_id: {
      type: mongoose.ObjectId,
      ref: "freeQuotes",
    },
    paid_amount: { type: Number, default: 0 },
    payment_amount: { type: String },
    transiction_id: { type: String },
    payment_date: { type: Date },
    recieved_from: { type: String },
    invoiceSent: { type: Boolean, default: false },
    comment: String,
    currency: String,
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("invoice", InvoiceSchema);
