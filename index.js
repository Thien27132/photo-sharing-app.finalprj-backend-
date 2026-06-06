const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config(); // Khởi tạo biến môi trường từ .env

// 1. Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 8081;

// BẮT BUỘC TRÊN CODESANDBOX: Bật trust proxy để Express cho phép gửi Cookie qua giao thức HTTPS của CodeSandbox
app.set("trust proxy", 1);

// 2. Kích hoạt kết nối Cơ sở dữ liệu MongoDB thông qua dbConnect
const dbConnect = require("./db/dbConnect");
dbConnect();

// 3. Cấu hình các Middleware tổng cục
app.use(
  cors({
    origin: true, // Cho phép tự động nhận diện URL của Frontend (không cần hardcode localhost:3000 nữa)
    credentials: true, // Cho phép gửi cookie session cross-origin
  })
);
app.use(express.json()); // Hỗ trợ parse dữ liệu dạng JSON từ Client gửi lên

// 4. Cấu hình Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "photo-sharing-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
      httpOnly: true,
      sameSite: "none", // BẮT BUỘC ĐỂ KHÔNG BỊ MẤT SESSION: Cho phép gửi cookie giữa 2 domain khác nhau
      secure: true, // BẮT BUỘC: Yêu cầu HTTPS (CodeSandbox mặc định đã chạy HTTPS)
    },
  })
);

// 5. Phục vụ kho ảnh tĩnh (Dùng cho tính năng hiển thị ảnh của UserPhotos)
// Toàn bộ ảnh nằm trong thư mục backend/images sẽ truy cập được qua: http://localhost:8081/images/tên_file.jpg
// (Trên Sandbox sẽ là: https://link-backend.csb.app/images/tên_file.jpg)
app.use("/images", express.static(path.join(__dirname, "images")));

// Route mặc định tại trang gốc để test nhanh trạng thái hoạt động của Server
app.get("/", (req, res) => {
  res.send("🚀 Backend Server đang chạy bình thường trên CodeSandbox!");
});

// ====================================================================
// 6. CÁC ROUTE XÁC THỰC (Đặt TRƯỚC auth middleware → không bị chặn)
// ====================================================================
const User = require("./db/userModel");

/**
 * POST /admin/login
 * Nhận body JSON chứa login_name và password.
 * - Nếu thiếu thông tin → trả status 400
 * - Nếu user không tồn tại → trả status 400
 * - Nếu password sai → trả status 400
 * - Nếu đúng → lưu vào session, trả { _id, first_name }
 */
app.post("/admin/login", async (req, res) => {
  const { login_name, password } = req.body;

  if (!login_name || !password) {
    return res
      .status(400)
      .json({ error: "login_name và password là bắt buộc" });
  }

  try {
    const user = await User.findOne({
      login_name: login_name.toLowerCase().trim(),
    });
    if (!user) {
      return res.status(400).json({
        error: "Tên đăng nhập không tồn tại",
      });
    }

    // So sánh mật khẩu plaintext
    if (password !== user.password) {
      return res.status(400).json({
        error: "Mật khẩu không đúng",
      });
    }

    // Lưu thông tin vào session
    req.session.user = {
      _id: user._id,
      login_name: user.login_name,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    // Trả về chỉ những thông tin cần thiết (bảo mật: không trả toàn bộ object user)
    res.status(200).json({
      _id: user._id,
      first_name: user.first_name,
    });
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    res.status(500).json({ error: "Lỗi hệ thống" });
  }
});

/**
 * POST /admin/logout
 * Body rỗng. Xóa session.
 * - Nếu user chưa đăng nhập → trả status 400
 * - Nếu đã đăng nhập → xóa session, trả 200
 */
app.post("/admin/logout", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(400).json({ error: "Bạn chưa đăng nhập" });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Đăng xuất thất bại" });
    }
    // Xóa cookie ở phía client
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Đăng xuất thành công" });
  });
});

// ====================================================================
// 7. MIDDLEWARE BẢO MẬT — Kiểm tra đăng nhập cho TẤT CẢ route phía dưới
//    Ngoại trừ: POST /user (đăng ký tài khoản mới)
// ====================================================================
app.use((req, res, next) => {
  // Cho phép đăng ký mà không cần đăng nhập
  if (req.path === "/user" && req.method === "POST") {
    return next();
  }

  // Kiểm tra session
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized - Vui lòng đăng nhập" });
  }

  next();
});

// ====================================================================
// 8. CÁC ROUTE ĐƯỢC BẢO VỆ (Phải đăng nhập mới truy cập được)
// ====================================================================
const userRouter = require("./routes/UserRouter");
const photoRouter = require("./routes/PhotoRouter");

app.use("/user", userRouter); // Các API như /user/list, /user/:id
app.use("/photosOfUser", photoRouter); // GET /photosOfUser/:id - Lấy ảnh của user
app.use("/commentsOfPhoto", photoRouter); // POST /commentsOfPhoto/:photo_id - Thêm bình luận

// NOTE: Upload endpoint removed to simplify backend (no image uploads).
// Nếu cần giữ model Photo trong DB, import vẫn có thể dùng ở tương lai.
const Photo = require("./db/photoModel");

// 9. Khởi chạy Server lắng nghe các request
app.listen(PORT, () => {
  console.log("==================================================");
  console.log(` Server đang chạy tại cổng: ${PORT}`);
  console.log(" Session: Đã bật xác thực (Hỗ trợ Cross-Origin)");
  console.log(" CORS: Đã mở kết nối cho Frontend");
  console.log("==================================================");
});
