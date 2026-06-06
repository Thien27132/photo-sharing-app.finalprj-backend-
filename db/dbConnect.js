const mongoose = require("mongoose");
require("dotenv").config(); // Kích hoạt để đọc dữ liệu từ file .env

async function dbConnect() {
  // Sử dụng mongoose để kết nối tới chuỗi DB_URL đã lưu trong file .env
  mongoose
    .connect(process.env.DB_URL)
    .then(() => {
      console.log("✅ Kết nối thành công tới MongoDB Atlas Cluster!");
    })
    .catch((error) => {
      console.error("❌ Thất bại! Không thể kết nối tới MongoDB Atlas.");
      console.error(error);
    });
}

module.exports = dbConnect;