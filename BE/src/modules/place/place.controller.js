import { ApiResponse } from "../../utils/response.utils.js";
import placeService from "./place.service.js";
import { CreatePlaceDto } from "./place.dto.js";

class PlaceController {
  async createPlace(req, res, next) {
    const { newPlace, isNew } = await placeService.createPlace(req.params.userId,new CreatePlaceDto(req.body));
    return res.status(200).json(ApiResponse.success({message: isNew ? "Đã lưu địa điểm" : "Địa điểm đã được đồng bộ trước đó",data: newPlace,}));
  }

  async getPlaces(req, res, next) {
      const places = await placeService.getPlacesByUser(req.params.userId);
      return res.status(200).json(ApiResponse.success({message: "Lấy danh sách địa điểm thành công",data: places,}));
  }

  async findNearby(req, res, next) {
    const { userId, lat, lng, radius } = req.params;
    const places = await placeService.findNearbyPlaces(userId,Number(lat),Number(lng),Number(radius));
    return res.status(200).json(ApiResponse.success({message: `Tìm thấy ${places.length} địa điểm trong bán kính ${radius}m`,data: places,}));
  }

  async deletePlace(req, res, next) {
    const deleted = await placeService.deletePlace(req.body.placeIds);
    return res.status(200).json(ApiResponse.success({message: `Đã xóa ${deleted.count} địa điểm`,data: deleted,}));
  }

  async getPotentialDuplicates(req, res, next) { 
    const duplicates = await placeService.getPotentialDuplicates(req.params.userId);
    return res.status(200).json(ApiResponse.success({message: `Có ${duplicates.length} nhóm nghi ngờ trùng`,data: duplicates,}));
  }

  async deletePotentialDuplicate(req, res, next) {
    const deleted = await placeService.deletePotentialDuplicate(req.params.id);
    return res.status(200).json(ApiResponse.success({message: "Đã đồng bộ",data: deleted,}));
  }
}

export default new PlaceController();