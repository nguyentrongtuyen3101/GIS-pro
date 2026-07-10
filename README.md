# Saved Places App

Ứng dụng lưu địa điểm yêu thích (quán café, công viên, nhà bạn bè...) và tìm các
địa điểm gần 1 vị trí cho trước. Hỗ trợ đồng bộ từ nhiều thiết bị mà không tạo
dữ liệu trùng lặp.

> Xem `DECISIONS.md` để biết chi tiết cách tiếp cận, các đánh đổi và lý do
> thiết kế — đây là phần quan trọng nhất của repo này.

## Yêu cầu môi trường

- Node.js >= 18
- MongoDB (local hoặc MongoDB Atlas)

## Cấu trúc thư mục

```
.
├── server/      # Backend — Express + Prisma (MongoDB)
└── client/      # Frontend — React
```

> Nếu cấu trúc thư mục thực tế của bạn đặt tên khác (VD `backend/`, `web/`),
> chỉ cần `cd` vào đúng thư mục tương ứng khi làm theo các bước dưới đây.

## 1. Chạy Backend

```bash
cd BE
npm install
```

File `.env` đã có sẵn trong repo (không chứa key/secret nhạy cảm, chỉ dùng
MongoDB server + các ngưỡng cấu hình dedup), nên **không cần tạo thêm** —
chạy thẳng bước tiếp theo.

Sinh Prisma Client và đồng bộ schema xuống database:

```bash
npx run build
npx run push
```

Chạy server ở chế độ dev:

```bash
npm run dev
```

Backend mặc định chạy tại `http://localhost:3000`.

## 2. Chạy Frontend

Mở 1 terminal khác:

```bash
cd FE
npm install
```

File `.env` cũng đã có sẵn trong repo, không cần tạo thêm.

Chạy frontend ở chế độ dev:

```bash
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173` (Vite) hoặc `http://localhost:3000`
(Create React App) — xem log trong terminal để biết chính xác cổng đang chạy.

## Tóm tắt các API chính (Backend)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/users/login` | Tạo mới 1 user hoặc đăng nhập |
| POST | `/places/create/:userId` | Tạo mới 1 địa điểm |
| GET | `/places/get/:userId` | Lấy danh sách địa điểm của user |
| GET | `/places/getNearby/:userId/:lat/:lng/:radius` | Tìm địa điểm gần 1 tọa độ |
| DELETE | `/places/delete` | Xóa nhiều địa điểm (body: `{ placeIds: [...] }`) |
| GET | `/places/getpotentialduplicates/:userId` | Lấy danh sách nghi ngờ trùng |
| DELETE | `/places/delete/:id` | Xóa 1 nhóm nghi ngờ trùng đã xử lý xong |

## Test API bằng Bruno

Collection Bruno mẫu nằm trong thư mục `Place/` ở gốc repo (cạnh `User/`) —
mở bằng [Bruno](https://www.usebruno.com/), chọn environment `local`, và chạy
thử từng request.

## Troubleshooting nhanh

- **Lỗi kết nối MongoDB**: kiểm tra `DATABASE_URL` trong `BE/.env`, đảm bảo
  MongoDB đang chạy (local) hoặc chuỗi kết nối Atlas đúng.
- **Prisma báo thiếu model/field**: chạy lại `npx run build` sau khi
  chỉnh sửa `schema.prisma`.
- **Frontend không gọi được API**: kiểm tra `VITE_API_BASE_URL` trong
  `FE/.env` có khớp với cổng backend đang chạy không, và CORS đã bật ở
  backend cho phép origin của frontend.

## Hướng dẫn sử dụng trang web

**Đầu tiên khi vào trang web sẽ là màn hình nhập username nếu đã có user name trước đó sẽ là đăng nhập còn ngược lại sẽ alf đang ký**
![login](images/image.png)

**Sau khi login xong sẽ lag màn hình chính của web gồm 2 phần chính là sidebar bên trái và màn hình map bên phải**
![home](images/image-1.png)

**Sidebar bên trái sẽ hiển thị danh sách các địa điểm user đã lưu trước đó**
![sidebar](images/image-2.png)

**Tại màn hình map cũng sẽ đánh dấu các địa điểm tương tự như danh sách địa điểm hiển thị ở sidebar**
![map](images/image-3.png)

**Tại phía trên bên trai màn hình map chó thanh tìm kiếm để có thể tra cứu địa điểm muốn tìm kiếm**
![map](images/image-4.png)

**Tại phía trên bên phải màn hình map là icon khi bấm vào sẽ chuyển map đến vị trí hiện tại user đang đứng**
![định vị](images/image-5.png)

**Khi bấm vào một địa điểm ở sidebar map sẽ tự chuyển đến địa điểm đó**
![map](images/image-6.png)

**Trong các trường hợp sau**
- click vào 1 địa điểm trên sidebar
- click vào 1 địa điểm được đánh dấu trên map
- click vào 1 địa điểm vừa tìm kiếm
- click vào 1 địa điểm bất kỳ không được đánh giấu trên map
> → **Kết quả:** Sidebar sẽ hiện lên một form để tìm các địa điểm ĐÃ LƯU trước đó cách địa điểm mà user vừa chọn tùy vào khoảng cách (đơn vị met) mà user nhập vào.
![neal](images/image-7.png)

**Nếu chọn một địa điểm sau tìm kiếm và được đánh dấu trên map thì sidebar sẽ hiển thị một form để lưu địa điểm và user không thể chỉnh sửa tên địa điểm khi lưu**
![create](images/image-8.png)

**Nếu user không tìm kiếm mà click ngẫu nhiên một vị trí trên map mà không được đánh dấu thì sidebar sẽ hiện form lưu nhưng có thể cho user chỉnh sửa tên địa điểm khi lưu**
![create random](images/image-9.png)

**Trong trường hợp khi lưu bị mất mạng bản ghi địa điểm sẽ hiển thị trạng thái Đang Đồng Bộ và trên header sẽ có thông báo mết kết nối**
![mất mạng](images/image-10.png)

**Trong trong trường hợp phía client ổn định nhưng phía server bị chết thfi bản ghi địa chỉ sẽ hiển thị trạng thái Lỗi Đồng Bộ và sau khi server kết nối trở lại user có thể click để tự retry hoặc sau 20s web sẽ tự động retry để lưu bản ghi và đồng bộ**
![chết server](images/image-11.png)

**Trong trường hợp user tự chọn địa điểm ko được đánh dấu nếu các địa điểm có tên quá giống nhau và khoảng cách đủ gần thì sẽ có thông báo ở icon gần tên user ở góc trên bên phải màn hình khi user click vào đó sẽ mở ra 1 modal và hiển thị danh sách các nhóm có nghi vấn trùng, khi này user có 2 lựa chọn cho mỗi nhóm trùng**
- chọn 1 địa điểm muốn giữ lại và đồng ý xóa các địa điểm trùng còn lại của nhóm.
- chọn không trùng và các địa điểm sẽ được xem là các địa điểm riêng biệt.
![gần](images/image-12.png)![xóa trùng](images/image-13.png)

**Khi muốn thêm tài khoản mới hãy bấm vào tên của bạn ở góc trên bên phải màn hình và nó sẽ có một lựa chọn hiện xuống và hãy click vào đó để nó đưa bạn đến màn hình đầu tiên**
![thêm acc](images/image-14.png)