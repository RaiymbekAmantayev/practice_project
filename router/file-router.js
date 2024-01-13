const fileController = require('../Controllers/fileController')
const router = require('express').Router()
const passport = require('../middleware/passport')


// Добавить пост
router.post('/add', passport.authenticate('jwt', {session: false}),  fileController.addFile)
router.get('/show', passport.authenticate('jwt', {session: false}),  fileController.ShowAll)
module.exports = router;