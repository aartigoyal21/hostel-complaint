const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    title: String,
    category: String,
    description: String,
    roomNo: String,
    status: {
      type: String,
      default: "Pending",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);