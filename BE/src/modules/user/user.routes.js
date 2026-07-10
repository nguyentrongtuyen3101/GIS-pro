import { Router } from "express";
import UserController from "./user.controller.js";

const userRouter = Router();

userRouter.post("/login", UserController.CreateUser);

export default userRouter;