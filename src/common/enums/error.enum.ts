export enum ErrorEnum {
  INVALID_TOKEN = '400:Mã truy cập không hợp lệ hoặc đã hết hạn!(Token)',
  INVALID_CTUET_EMAIL = '400:Email không hợp lệ (@student.ctuet.edu.vn hoặc @ctuet.edu.vn)',
  INVALID_LOGIN = '400:Email hoặc mật khẩu không đúng!',
  USER_NOT_FOUND = '400:Người dùng không tồn tại',
  USER_UNAVAILABLE = '400:Tài khoản đã bị khóa hoặc chưa xác thực!',
  TOKEN_IS_REQUIRED = '400:Yêu cầu mã truy cập!(Token)',
  USER_IS_DESABLED = '400:Người dùng đã bị khóa',
  USER_IS_EXISTED = '400:Email đã được liên kết với 1 tài khoản khác',
  NO_PERMISSION = '400:Truy cập bị từ chối',
  RECORD_EXISTED = '400:Bản ghi đã tồn tại!',
  RECORD_IN_USED = '400:Bản ghi đang được dùng!',
  RECORD_NOT_FOUND = '400:Bản ghi không tồn tại!',
}
