const fileController = require('../Controllers/fileController')
const router = require('express').Router()
const passport = require('../../middleware/passport')


// Добавить пост
router.post('/add', passport.authenticate('jwt', {session: false}), fileController.upload, fileController.addFile)
module.exports = router;