const router = require("express").Router();
// eslint-disable-next-line no-unused-vars,no-undef
const PointController = require("../Controllers/pointController");
// eslint-disable-next-line no-undef

router.post("/add",   PointController.addPoint);
router.get("/show",   PointController.showPoint);
router.delete("/:id", PointController.Delete)
module.exports=router;