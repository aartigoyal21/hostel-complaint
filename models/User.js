// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     name: String,
//     email: String,
//     password: String,
//     hostelBlock: String,
//     roomNo: String,
//     profilePic: String,
//     role: {
//       type: String,
//       default: "student",
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // existing login ke liye
  googleId: String   // 👈 ADD THIS
});

module.exports = mongoose.model("User", userSchema);