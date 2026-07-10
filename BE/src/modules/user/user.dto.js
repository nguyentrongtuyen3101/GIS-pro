import { BadRequestException } from "../../utils/exceptions.utils.js";

export class CreateUserDto {
  constructor(data) {
    this.username = data.username?.trim();
    this.validate();
  }

  validate() {
  if (!this.username) {
    throw new BadRequestException("Vui lòng nhập username");
  }

  if (this.username.length < 3) {
    throw new BadRequestException(
      "Username phải có ít nhất 3 ký tự"
    );
  }

  if (/\s/.test(this.username)) {
    throw new BadRequestException(
      "Username không được chứa dấu cách"
    );
  }

  if (/[À-ỹ]/u.test(this.username)) {
    throw new BadRequestException(
      "Username không được chứa dấu tiếng Việt"
    );
  }
}
}