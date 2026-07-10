import { BadRequestException } from "../../utils/exceptions.utils.js";

export class CreatePlaceDto {
  constructor(data) {
    this.clientId = data.clientId?.trim();
    this.deviceId = data.deviceId?.trim();
    this.name = data.name?.trim();
    this.lat = data.lat;
    this.lng = data.lng;

    this.validate();

    // computed field, not provided by client — used for fuzzy duplicate matching
    this.nameNormalized = this.normalizeName(this.name);
  }

  validate() {
    if (!this.clientId) {
      throw new BadRequestException("Thiếu clientId");
    }

    if (!this.isValidUUID(this.clientId)) {
      throw new BadRequestException("clientId không hợp lệ (phải là UUID)");
    }

    if (!this.deviceId) {
      throw new BadRequestException("Thiếu deviceId");
    }

    if (!this.name) {
      throw new BadRequestException("Vui lòng nhập tên địa điểm");
    }

    if (this.name.length < 2) {
      throw new BadRequestException("Tên địa điểm phải có ít nhất 2 ký tự");
    }

    if (this.name.length > 200) {
      throw new BadRequestException("Tên địa điểm không được vượt quá 200 ký tự");
    }

    if (this.lat === undefined || this.lat === null || isNaN(this.lat)) {
      throw new BadRequestException("Thiếu hoặc sai định dạng vĩ độ (lat)");
    }

    if (this.lng === undefined || this.lng === null || isNaN(this.lng)) {
      throw new BadRequestException("Thiếu hoặc sai định dạng kinh độ (lng)");
    }

    if (this.lat < -90 || this.lat > 90) {
      throw new BadRequestException("Vĩ độ (lat) phải nằm trong khoảng -90 đến 90");
    }

    if (this.lng < -180 || this.lng > 180) {
      throw new BadRequestException("Kinh độ (lng) phải nằm trong khoảng -180 đến 180");
    }
  }

  isValidUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  }
  normalizeName(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim();
  }
}