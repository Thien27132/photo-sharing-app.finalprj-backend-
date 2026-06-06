const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Thông tin đăng nhập
  login_name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  
  // Thông tin cá nhân
  first_name: { type: String },
  last_name: { type: String },
  location: { type: String },
  description: { type: String },
  occupation: { type: String },
});

module.exports = mongoose.model("Users", userSchema);
