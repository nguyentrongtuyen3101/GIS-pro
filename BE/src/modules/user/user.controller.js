import {ApiResponse } from "../../utils/response.utils.js";
import userService from "./user.service.js";
import { CreateUserDto } from "./user.dto.js";

class UserController {
  
  async CreateUser(req, res, next) {
    const user =  await userService.createOrGetUser(new CreateUserDto(req.body));
    return res.status(200).json(ApiResponse.success({message: "Welcome to Your Map",data: user,}));
    }
}
export default new UserController();
