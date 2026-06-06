const express = require("express");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();

router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    // 1. Lấy tất cả ảnh của user, dùng lean() để có thể chỉnh sửa object
    let photos = await Photo.find({ user_id: userId }).lean();

    if (photos.length === 0) {
      const userExists = await User.exists({ _id: userId });
      if (!userExists) return res.status(400).send("User ID không tồn tại");
      return res.json([]); 
    }

    // 2. Lắp ghép thông tin: Với mỗi ảnh, duyệt qua từng comment
    for (let photo of photos) {
      if (photo.comments) {
        for (let comment of photo.comments) {
          // Tìm thông tin người viết comment
          const author = await User.findById(comment.user_id)
                                   .select("_id first_name last_name")
                                   .lean();
          comment.user = author; // Gán object user vào comment
          delete comment.user_id; // Xóa id cũ cho đúng spec
        }
      }
    }
    res.json(photos);
  } catch (err) {
    res.status(400).send("Lỗi xử lý yêu cầu");
  }
});

/**
 * POST /commentsOfPhoto/:photo_id
 * Thêm bình luận vào ảnh có id tương ứng.
 * Body JSON: { comment: "nội dung" }
 * user_id lấy từ session (không tin tưởng client)
 * date_time tự động tạo
 */
router.post("/:photo_id", async (req, res) => {
  try {
    const { comment } = req.body;

    // Validate: nội dung bình luận không được rỗng
    if (!comment || comment.trim() === "") {
      return res.status(400).json({
        error: "Nội dung bình luận không được để trống"
      });
    }

    // Tìm ảnh theo photo_id
    const photo = await Photo.findById(req.params.photo_id);
    if (!photo) {
      return res.status(400).json({ error: "Không tìm thấy ảnh" });
    }

    // Tạo object comment mới — user_id lấy từ session (bảo mật)
    const newComment = {
      comment: comment.trim(),
      user_id: req.session.user._id,  
      date_time: new Date(),
    };

    // Push vào mảng comments của ảnh
    photo.comments.push(newComment);
    await photo.save();

    // Lấy comment vừa thêm (phần tử cuối cùng trong mảng)
    const addedComment = photo.comments[photo.comments.length - 1];

    // Trả về comment kèm thông tin user để frontend hiển thị ngay
    const user = await User.findById(req.session.user._id)
                           .select("_id first_name last_name")
                           .lean();

    res.status(200).json({
      _id: addedComment._id,
      comment: addedComment.comment,
      date_time: addedComment.date_time,
      user: user,
    });
  } catch (err) {
    console.error("Lỗi thêm bình luận:", err);
    res.status(400).json({ error: "Lỗi khi thêm bình luận" });
  }
});

module.exports = router;