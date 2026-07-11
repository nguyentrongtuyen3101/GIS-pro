# DECISIONS.md

## 1. Hiểu vấn đề

**Phần 1** yêu cầu 1 app end-to-end: lưu địa điểm (café, công viên, nhà bạn
bè...) và trả lời được "địa điểm nào gần 1 vị trí cho trước". Cái quan trọng
nhất: ra được một app end to end hoàn thiện có ui có server có db và thực hiện 
được một luồng đi từ đầu đến cuối hoàn thành tốt chức năng đề bài đưa ra.
Cái ít quan trọng : số lượng tính năng của app.

**Phần 2** yêu cầu mở rộng để nhiều thiết bị của cùng 1 user đồng bộ mà
không tạo dữ liệu trùng, kể cả khi offline/retry. Cái quan trọng nhất: định
nghĩa rõ ràng "thế nào là trùng" và xử lý đúng 2 loại trùng có bản chất khác
nhau (trùng do kỹ thuật — retry/đồng bộ chéo — vs. trùng do 2 nơi tạo độc
lập). Cái ít quan trọng hơn: tối ưu hiệu năng đồng bộ.

## 2. Cách phân tích và scope

Tôi chia vấn đề dedup thành 2 tầng hoàn toàn khác nhau về độ chắc chắn:

- **Tầng chắc chắn 100%**: cùng 1 hành động gửi bị lặp lại (retry mạng lỗi,
  đồng bộ chéo giữa các thiết bị đã biết chung 1 record) — xử lý bằng
  idempotency key (`clientId`), không cần đoán.
- **Tầng không chắc chắn**: 2 thiết bị tạo độc lập, không biết về nhau —
  không có gì đảm bảo tuyệt đối, phải dùng suy đoán (tên gần giống + tọa độ
  gần) và **luôn để user xác nhận** thay vì tự động quyết định sai.

Tôi build đầy đủ: CRUD địa điểm, tìm nearby, idempotency qua `clientId`,
phát hiện nghi ngờ trùng (2 mức: chắc chắn tự xử lý, nghi vấn chờ user), UI
hiển thị trạng thái đồng bộ (pending/synced/failed), hàng đợi retry tự động
khi mất mạng/server lỗi, modal xử lý các nhóm nghi ngờ trùng.

Tôi **không** build: xác thực đầy đủ (JWT, hash password), edit/update địa
điểm (chỉ có create + delete), geospatial index thật sự (dùng Haversine tính
tay), test tự động. Lý do nằm ở mục 11 và 13.

## 3. Lý do các quyết định chính

- **Idempotency bằng `clientId` sinh phía client, không phải server**: chỉ
  client biết "đây là 1 hành động lưu mới hay là gửi lại do lỗi mạng" —
  server không thể tự suy luận điều này chỉ từ nội dung request.
- **Insert thẳng + bắt lỗi `P2002` (unique constraint), thay vì
  "check-rồi-mới-insert"**: cách check trước có lỗ hổng race condition (2
  request đến gần như đồng thời có thể cùng "thấy" chưa tồn tại rồi cùng
  insert). Để database tự chặn tại đúng thời điểm ghi dữ liệu, không có
  khoảng hở thời gian nào.
- **2 ngưỡng riêng cho fuzzy match** (`EXACT_MATCH_DISTANCE_METERS` rất hẹp
  ~1m cho case chắc chắn, `DUPLICATE_DISTANCE_METERS` rộng hơn ~15m cho case
  nghi vấn): vì "tên giống 100%" chưa đủ để tự động xóa — cần tọa độ cũng
  gần như trùng khít mới đủ tin cậy để tự động hóa; còn lại luôn hỏi user.
- **Không dùng `googlePlaceId` để dedup**: tưởng là sẽ chắc chắn 100% với
  POI thật, nhưng với vị trí user tự bấm tay trên map (không qua tìm kiếm),
  reverse-geocode trả về `place_id` không ổn định (2 lần bấm lệch vài mét có
  thể ra 2 `place_id` khác nhau) — không đáng tin hơn tọa độ thô, nên bỏ,
  giữ nguyên 1 cơ chế fuzzy-match duy nhất cho mọi loại địa điểm.
- **Soft delete (`isDeleted`) thay vì xóa thật**: để tránh trường hợp 1 bản
  edit/tạo cũ đến muộn (do offline lâu) vô tình "hồi sinh" 1 record đã bị
  xóa, vì hệ thống vẫn còn dữ liệu để đối chiếu.

## 4. Data & API

**User**: `id`, `username` (unique, không password — auth mức tối giản cho
demo). **Place**: `id`, `userId`, `clientId` (idempotency key), `deviceId`,
`name`, `nameNormalized` (bản chuẩn hóa dùng để fuzzy match), `lat`, `lng`,
`version`, `isDeleted`, `status` (pending/synced/failed), `createdAt`,
`updatedAt`, `syncedAt`. **PotentialDuplicate**: `id`, `userId`, `placeIds[]`,
`isDeleted`.

Nếu cần thêm **categories**: thêm model `Category` riêng + field
`categoryId` (hoặc mảng `categoryIds` nếu 1 địa điểm thuộc nhiều category)
trên `Place` — không đụng đến phần dedup/sync hiện có, vì category là thuộc
tính mô tả, không ảnh hưởng đến việc "đây có phải cùng 1 địa điểm" hay
không.

Nếu cần **nhiều user cùng truy cập 1 địa điểm** (chia sẻ, cộng tác): hiện
tại `Place` thuộc về đúng 1 `userId`; để mở rộng, thêm bảng trung gian kiểu
`PlaceCollaborator (placeId, userId, role)` thay vì đổi `userId` thành mảng
— giữ được người tạo gốc rõ ràng, đồng thời cho phép chia sẻ với người khác.

## 5. "Nearby" — tính và lưu như thế nào

Tính bằng công thức Haversine (thuần JS, không phụ thuộc thư viện ngoài),
chạy trên toàn bộ địa điểm của 1 user rồi lọc theo bán kính, sort gần → xa.
Đơn giản, đủ dùng cho demo (1 user thường chỉ có vài chục/vài trăm địa
điểm).

**Không scale tốt** khi dữ liệu lớn: cách này phải load hết địa điểm của
user về rồi tính tay từng cái, không tận dụng được index không gian. Hướng
đúng khi scale: chuyển tọa độ sang GeoJSON Point, tạo `2dsphere` index trên
MongoDB, dùng aggregation `$geoNear` để DB tự lọc + sort bằng index thay vì
quét toàn bộ. Tôi biết hướng này nhưng chưa implement — chấp nhận được cho
scope demo, đã ghi rõ ở mục 11.

**Khi có nhiều user, nhiều dữ liệu hơn** — hướng xử lý đề xuất:

- **Mọi query nearby đã scope theo `userId`** (`where: { userId, ... }`),
  nên số lượng *user* tăng lên không trực tiếp làm chậm 1 lần tìm kiếm — mỗi
  query chỉ quét dữ liệu của đúng 1 user, không phải toàn bộ hệ thống. Vấn
  đề chỉ thực sự phát sinh khi **1 user cụ thể** có rất nhiều địa điểm (VD
  hàng chục nghìn), lúc đó `2dsphere` + `$geoNear` (nêu trên) là bước bắt
  buộc để không phải quét hết dữ liệu của riêng user đó.
- **Giới hạn kết quả trả về** (`limit`, VD tối đa 50–100 điểm gần nhất) thay
  vì trả về toàn bộ điểm trong bán kính — tránh 1 bán kính quá lớn vô tình
  kéo về hàng nghìn record cùng lúc, vừa nặng cho DB vừa vô nghĩa với UI
  (user không cần xem hết).
- **Cache kết quả tìm kiếm gần đây** (theo cặp tọa độ + bán kính, TTL ngắn
  vài chục giây) nếu nhận thấy user hay bấm lại gần đúng 1 vị trí (VD kéo
  bản đồ qua lại quanh 1 khu vực) — giảm số lần phải tính lại từ đầu.
- **Sharding theo `userId`** (MongoDB hỗ trợ shard key) nếu tổng số user và
  tổng dữ liệu toàn hệ thống lớn đến mức 1 server không kham nổi — vì dữ
  liệu vốn đã tách biệt theo user, `userId` là shard key tự nhiên, không cần
  thiết kế lại schema.

Các hướng trên chưa cái nào được implement trong scope demo này — đây là
gợi ý cho việc mở rộng khi cần, không phải yêu cầu bắt buộc ở quy mô hiện
tại.

## 6. Frontend ↔ Backend

FE gọi REST API qua 1 lớp `placeApi` riêng (dùng chung 1 `apiClient` cho mọi
request). Việc đồng bộ được tách hẳn khỏi luồng gọi API thông thường, thông
qua 1 **hàng đợi local lưu bằng IndexedDB** (qua thư viện `idb`, không dùng
`localStorage` — vì cần query theo index và lưu được nhiều dữ liệu hơn, như
đã phân tích ở phần offline-first).

**Luồng khi user lưu 1 địa điểm** (`enqueueAndSync`):
1. Sinh `clientId` mới (`newClientId()`) + lấy `deviceId` cố định của thiết
   bị (`getDeviceId()`, lưu bền trong `localStorage` để không đổi giữa các
   lần mở app).
2. Ghi ngay item vào IndexedDB với `status: "pending"` — UI hiển thị
   **ngay lập tức**, không chờ server phản hồi (optimistic UI).
3. Gọi API `createPlace` chạy nền, không chặn UI (`attemptSync`, không
   `await` ở chỗ gọi).

**Xử lý kết quả gọi API** (`attemptSync`):
- Nếu **đang offline** (`navigator.onLine === false`): không gọi API luôn,
  giữ nguyên `pending` — cố tình **không** chuyển sang `failed` khi chỉ là
  do mất mạng, để tránh gây hiểu nhầm "lỗi thật" trong khi chỉ là chưa có
  mạng để gửi.
- Nếu gọi API **thành công**: xóa hẳn item khỏi hàng đợi local. Từ lúc này,
  "đã đồng bộ" được thể hiện qua việc địa điểm xuất hiện trong danh sách
  `places` lấy từ server ở lần gọi `getPlacesByUser` tiếp theo — `synced`
  **không phải 1 trạng thái được lưu lại** trong hàng đợi, mà là hệ quả của
  việc item đã biến mất khỏi đó.
- Nếu gọi API **thất bại thật sự** (server trả lỗi 4xx/5xx, không phải do
  mất mạng): chuyển `status: "failed"`, lưu kèm `errorMessage`, tăng
  `attempts`, ghi `lastAttemptAt` — để user biết cần xử lý, không tự động
  retry vô hạn một cách âm thầm.

**Cơ chế tự động đồng bộ lại** (`flushQueue`), chạy trong 3 tình huống:
- Ngay khi app khởi động (load lại queue local từ IndexedDB + thử flush
  luôn, phòng trường hợp có item `pending`/`failed` từ phiên trước).
- Khi trình duyệt chuyển từ offline → online (lắng nghe event
  `online`/`offline` của `window`), kèm gọi `onReconnectSynced(count)` để
  báo toast "đã có mạng, đồng bộ xong N địa điểm".
- Định kỳ mỗi 20 giây (`RETRY_INTERVAL_MS`), phòng trường hợp vẫn còn mạng
  nhưng server tạm thời lỗi (không phải do offline).

Ngoài ra có `retry(clientId)` cho nút "thử lại" thủ công (user chủ động bấm
với 1 item `failed`), và `discard(clientId)` để hủy 1 item chưa đồng bộ
(chỉ xóa ở local, chưa từng chạm tới server nên không cần gọi API xóa).

**Danh sách hiển thị trên UI** là **gộp của 2 nguồn**: các item còn trong
hàng đợi local IndexedDB (`pending`/`failed`) + các địa điểm server đã xác
nhận (`places`, lấy qua `getPlacesByUser`) — để user luôn thấy đúng trạng
thái, kể cả khi offline hoàn toàn và chưa gửi được gì lên server.

**Idempotency phía FE**: `createPlace` gọi API với `raw: true` để lấy được
cả `message` từ response ("Đã lưu địa điểm" vs "Địa điểm đã được đồng bộ
trước đó"), giúp phân biệt được record này là mới tạo hay do server phát
hiện trùng `clientId` (trường hợp retry) — dù với UI hiện tại cả 2 case đều
xử lý như nhau (xóa khỏi hàng đợi, coi là thành công).

## 7. Deduplication & Idempotency

**Định nghĩa trùng** chia làm 2 loại, xử lý khác nhau:

- **Trùng kỹ thuật (chắc chắn 100%)**: cùng `(userId, clientId)` — do retry
  hoặc đồng bộ chéo giữa các thiết bị đã biết chung 1 record. Chặn bằng
  ràng buộc `@@unique([userId, clientId])` ở tầng database; code chỉ cần
  insert thẳng và bắt lỗi `P2002`, không cần check trước (tránh race
  condition).
- **Trùng nội dung (nghi vấn)**: 2 record khác `clientId`, nhưng tên gần
  giống (Levenshtein similarity) + tọa độ gần nhau (Haversine). Tách tiếp 2
  mức: tên giống **tuyệt đối** (100%) + tọa độ **cực sát** (≤1m) → tự động
  soft-delete bản mới, giữ bản cũ; tên giống **80–99%** + tọa độ trong bán
  kính rộng hơn (≤15m) → chỉ ghi vào bảng `PotentialDuplicate`, không tự xử
  lý, chờ user xác nhận.

## 8. Multiple devices & Offline

Mỗi thiết bị giữ 1 hàng đợi local độc lập cho các item chưa đồng bộ xong.
Khi có mạng trở lại, hàng đợi tự động gửi lên server; khi 1 thiết bị khác
tạo/sửa dữ liệu, các thiết bị còn lại thấy thay đổi ở lần gọi API lấy danh
sách tiếp theo (pull-based, không có realtime push giữa các thiết bị trong
scope demo này).

"Cùng 1 địa điểm từ 2 thiết bị" được phân biệt theo nguồn gốc: nếu đã từng
đồng bộ qua server (cùng `clientId` do đã pull về từ trước) → chặn chắc
chắn; nếu 2 thiết bị tạo độc lập trước khi biết về nhau (khác `clientId`) →
dựa vào fuzzy match như mục 7.

**Giới hạn đã biết**: nếu thiết bị A tạo 1 record trong lúc offline (đang
`pending`), rồi thiết bị B tạo và **xóa** 1 record tương tự trước khi A kịp
đồng bộ, khi A đồng bộ lại (khác `clientId`), hệ thống sẽ không phát hiện
được trùng vì record đã xóa bị loại khỏi danh sách so khớp — dẫn đến "hồi
sinh" ngoài ý muốn. Đã nhận diện, chưa xử lý — xem mục 13.

## 9. Ordering & Conflicts

Hiện tại app chỉ hỗ trợ create + delete (chưa có edit), nên xung đột chủ
yếu là "tạo trùng" (xử lý ở mục 7) và "xóa nhầm dữ liệu chưa kịp đồng bộ".
`isDeleted` (soft delete) đảm bảo dữ liệu đã xóa vẫn còn dấu vết, tránh bị
"hồi sinh" nhầm bởi dữ liệu edit/create cũ đến muộn. Field `version` và
`updatedAt` đã có sẵn trong schema, chuẩn bị cho việc thêm edit + last-write-
wins conflict resolution sau này, nhưng logic đó **chưa được code** trong
scope hiện tại.

## 10. Sync state trong UI

- Mỗi địa điểm trong sidebar hiện rõ trạng thái: 🕒 đang chờ đồng bộ / ✅ đã
  đồng bộ / ⚠️ lỗi đồng bộ (kèm nút thử lại thủ công).
- Header hiện banner "mất kết nối" khi offline, và toast xác nhận khi có
  mạng trở lại + đồng bộ xong.
- Nhóm nghi ngờ trùng hiện qua badge số lượng trên icon riêng ở header, mở
  ra modal để xử lý (giữ 1 bản / xác nhận không trùng).

## 11. Trade-offs

- **Auth chỉ có username, không password/JWT** — chấp nhận được cho demo cá
  nhân, không phù hợp cho production thật.
- **Nearby tính bằng Haversine thuần, không dùng geospatial index** — đủ
  nhanh với vài trăm địa điểm/user, sẽ chậm dần khi data lớn.
- **Fuzzy match dựa trên Levenshtein (so ký tự) không hiểu ngữ nghĩa** —
  các tên khác nghĩa nhưng gần giống về chữ viết (VD "bún" vs "bánh") có thể
  bị báo nhầm là nghi vấn trùng. Vì hệ thống không tự động xóa các case
  nghi vấn (chỉ tự xử lý khi tên giống tuyệt đối 100% + tọa độ cực sát),
  hậu quả chỉ dừng ở mức làm phiền UI, không mất dữ liệu.
- **Rủi ro còn lại của rule tự động xóa (100% + ≤5m)**: 2 chi nhánh khác
  nhau của cùng 1 chuỗi cửa hàng, đứng rất gần nhau (VD cùng tòa nhà), tên
  hiển thị giống hệt nhau, có thể bị nhầm là 1 địa điểm và xóa nhầm 1 chi
  nhánh có thật. Chấp nhận được vì tần suất thấp với use case cá nhân.
- **Không kiểm tra quyền sở hữu khi xóa** (`deletePlace`,
  `deletePotentialDuplicate` chỉ cần biết `id`, không check `userId`) — đơn
  giản hóa cho demo, không an toàn cho production.

## 12. Nếu thành sản phẩm thật — sẽ harden gì trước

1. Xác thực đầy đủ (hash password, JWT/session) + kiểm tra quyền sở hữu
   trên mọi endpoint sửa/xóa dữ liệu.
2. Chuyển "nearby" sang dùng MongoDB `2dsphere` index + `$geoNear` để scale.
3. Tách bước phát hiện trùng (`flagPotentialDuplicates`) ra background
   job/queue riêng thay vì chạy đồng bộ trong request tạo địa điểm, để API
   trả lời nhanh hơn khi dữ liệu lớn.
4. Thêm edit/update thật sự + cơ chế conflict resolution dựa trên `version`
   (optimistic concurrency), không chỉ dừng ở create/delete.
5. Rate limiting, validate input chặt hơn, logging/observability, dọn dẹp
   định kỳ các bản ghi soft-delete quá cũ.

## 13. Chưa kịp làm

- Chức năng **sửa (edit)** địa điểm và cơ chế xử lý xung đột khi 2 bản edit
  đến không đúng thứ tự — hiện chỉ có create + delete.(phần này lý do chủ yếu
  là tôi chưa biết nên sử lý như nào vì đại điểm nếu có sửa chỉ sửa mỗi tên 
  nhưng với các địa điểm được đánh dấu thì tôi đang không cho phép điều đó nên 
  tôi nghĩ với trường hợp địa điểm khi lưu không được đánh dấu thì sẽ có thể sửa 
  nhưng tôi không làm vì tôi nghĩ chỉ cần xóa rồi thêm lại địa điểm là được)
- Case "hồi sinh ngoài ý muốn" nêu ở mục 8 (thiết bị offline tạo lại đúng
  lúc thiết bị khác vừa xóa bản tương tự) — đã nhận diện, chưa xử lý; hướng
  khắc phục là mở rộng phạm vi so khớp trùng để bao gồm cả các bản ghi vừa
  bị xóa gần đây, thay vì loại bỏ hoàn toàn.
- Test tự động (unit test cho các hàm fuzzy-match, integration test cho
  luồng sync).
- Geospatial index thật sự cho "nearby" (mục 5, 12).
- Kiểm tra quyền sở hữu khi xóa dữ liệu (mục 11, 12).
