import { Router } from "express";
import userRouter from "../modules/user/user.routes.js";
import placeRouter from "../modules/place/place.routes.js";
const router = Router();

router.use("/users", userRouter);
router.use("/places", placeRouter);

export default router;