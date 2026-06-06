const express = require("express");
const User = require("../db/userModel");
const router = express.Router();

// 1. Lấy danh sách rút gọn cho sidebar
router.get("/list", async (req, res) => {
  try {
    const users = await User.find({}).select("_id first_name last_name");
    res.json(users);
  } catch (err) {
    res.status(500).send("Lỗi hệ thống");
  }
});

// 2. Lấy chi tiết 1 user
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
                           .select("_id first_name last_name location description occupation");
    if (!user) return res.status(400).send("Không tìm thấy user");
    res.json(user);
  } catch (err) {
    res.status(400).send("ID không hợp lệ");
  }
});

// 3. Đăng ký tài khoản mới
router.post("/", async (req, res) => {
  try {
    // Bước 1: Trích xuất tất cả thông tin từ body
    const { login_name, password, first_name, last_name, location, description, occupation } = req.body;
    
    // Bước 2: Validate nghiêm ngặt — login_name, password, first_name, last_name bắt buộc
    if (!login_name || !login_name.trim()) {
      return res.status(400).json({
        error: "login_name là bắt buộc và không được để trống"
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        error: "password là bắt buộc và không được để trống"
      });
    }

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({
        error: "first_name là bắt buộc và không được để trống"
      });
    }

    if (!last_name || !last_name.trim()) {
      return res.status(400).json({
        error: "last_name là bắt buộc và không được để trống"
      });
    }

    // Bước 3: Kiểm tra login_name có tồn tại chưa
    const existingUser = await User.findOne({ login_name: login_name.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        error: "login_name này đã được đăng ký. Vui lòng chọn tên khác."
      });
    }

    // Bước 4: Tạo user mới với mật khẩu plaintext
    const newUser = new User({
      login_name: login_name.toLowerCase().trim(),
      password: password.trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    // Bước 5: Lưu vào database
    await newUser.save();

    // Bước 6: Trả về thông tin user đã tạo (không trả password)
    res.status(200).json({
      message: "Đăng ký thành công!",
      user: {
        _id: newUser._id,
        login_name: newUser.login_name,
        first_name: newUser.first_name,
        last_name: newUser.last_name
      }
    });

  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    res.status(500).json({
      error: "Lỗi hệ thống khi đăng ký"
    });
  }
});

module.exports = router;