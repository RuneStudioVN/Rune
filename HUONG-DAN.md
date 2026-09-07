# RUNESTUDIO — Web + trang admin (miễn phí)

Web chạy trên Netlify, nội dung sửa ở trang **/admin** (Decap CMS). Toàn bộ 0 đồng, chỉ tốn tên miền.

## A. Đưa web lên (làm 1 lần, ~20 phút)

### 1. Tạo GitHub
1. Vào https://github.com → Sign up (miễn phí).
2. Bấm **New repository** → tên `runestudio` → Public hoặc Private đều được → **Create repository**.
3. Trong repo mới, bấm **uploading an existing file** → kéo **toàn bộ file trong thư mục `runestudio`** (không kéo thư mục cha, kéo các file/thư mục con: index.html, css, js, content, admin, assets…) → **Commit changes**.
   - Kiểm tra: mở repo phải thấy `index.html` ở ngay ngoài cùng, không nằm trong thư mục con.

### 2. Nối Netlify với GitHub
1. Vào https://app.netlify.com → đăng ký bằng GitHub.
2. **Add new site → Import an existing project → GitHub** → chọn repo `runestudio`.
3. Build settings để trống hết (Build command trống, Publish directory `/` hoặc trống) → **Deploy**.
4. Có link `xxx.netlify.app`. Đổi tên cho đẹp: Site configuration → Change site name.

### 3. Bật đăng nhập cho trang admin
1. Trong Netlify, vào site → **Integrations** (hoặc **Site configuration**) → tìm **Identity** → **Enable Identity**.
2. Identity → **Registration** → chọn **Invite only** (để người lạ không tự đăng ký).
3. Identity → **Services → Git Gateway → Enable Git Gateway**.
4. Identity → **Invite users** → nhập email của ngài → mở mail → bấm link → đặt mật khẩu.

### 4. Vào admin
Mở `https://xxx.netlify.app/admin` → đăng nhập → sửa. Bấm **Publish** là web tự cập nhật sau ~30 giây.

### 5. Gắn tên miền (khi đã mua)
Netlify → **Domain management → Add a domain** → nhập tên miền → làm theo hướng dẫn (đổi Nameserver ở nơi mua tên miền sang của Netlify là đơn giản nhất). SSL tự cấp.

## B. Sửa nội dung trong /admin
| Mục | Sửa được gì |
|---|---|
| **Thông tin chung** | Tên, slogan, SĐT, email, địa chỉ, giờ làm việc, link Zalo / Messenger / TikTok / Facebook — hiện ở footer và trang Liên hệ |
| **Dịch vụ** | Thêm/bớt dịch vụ, mô tả, các điểm chính, ảnh — hiện ở Trang chủ và trang Dịch vụ |
| **Dự án** | Tên, ngành, khách hàng, dịch vụ đã làm, kết quả, ảnh, **link video TikTok/YouTube**, mô tả chi tiết, tick "Hiện ở Trang chủ" |
| **Tin tức** | Tiêu đề, ngày, chủ đề, tóm tắt, ảnh, link video, nội dung |

**Mã (slug):** gõ không dấu, nối bằng gạch ngang, mỗi dự án/bài phải khác nhau. VD: `ganh-keo-ne`.

**Video:** dán link dạng `https://www.tiktok.com/@ten/video/123...` hoặc `https://youtu.be/...` — web tự hiện player đúng khung dọc/ngang.

**Ảnh:** bấm "Choose an image" → Upload. Nên nén ảnh dưới 500KB trước khi up (dùng tinypng.com).

## C. Sửa chữ cố định (Trang chủ, Giới thiệu…)
Chữ ở Hero, About, Case study, Con số, Team… nằm trong file `.html`. Sửa trực tiếp trên GitHub: mở file → biểu tượng bút chì → sửa → Commit. Hoặc nhắn Rune.

## D. Xem thử trên máy (tuỳ chọn)
Mở file trực tiếp sẽ **không** hiện dự án/dịch vụ (trình duyệt chặn đọc file JSON). Muốn xem trên máy: đưa lên Netlify xem là dễ nhất.
