const router = require("express").Router();
// eslint-disable-next-line no-unused-vars,no-undef
const ReplicaseController = require("../Controllers/Replicas_Controller");
// eslint-disable-next-line no-undef

router.post("/add",  ReplicaseController.SendReplicas);
router.get("/show", ReplicaseController.Show)
router.get("/showByDoc", ReplicaseController.ShowByDocId)
// router.get("/show",  PointController.showPoint);
module.exports=router;