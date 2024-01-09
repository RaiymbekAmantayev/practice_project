const router = require("express").Router();
// eslint-disable-next-line no-unused-vars,no-undef
const UserController = require("../Controllers/userController");
router.post("/auth",  UserController.Auth);
router.post("/login",  UserController.Login);
module.exports=router;