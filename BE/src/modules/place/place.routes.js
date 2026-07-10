import { Router } from "express";
import PlaceController from "./place.controller.js";

const placeRouter = Router();

placeRouter.post("/create/:userId", PlaceController.createPlace);
placeRouter.get("/get/:userId", PlaceController.getPlaces);
placeRouter.get("/getNearby/:userId/:lat/:lng/:radius", PlaceController.findNearby);
placeRouter.delete("/delete", PlaceController.deletePlace);
placeRouter.get("/getpotentialduplicates/:userId", PlaceController.getPotentialDuplicates);
placeRouter.delete("/delete/:id", PlaceController.deletePotentialDuplicate);

export default placeRouter;