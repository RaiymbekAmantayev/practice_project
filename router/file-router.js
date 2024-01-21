const fileController = require('../Controllers/fileController')
const router = require('express').Router()
const passport = require('../middleware/passport')


router.post('/add', passport.authenticate('jwt', {session: false}),  fileController.addFile)
router.get('/show', passport.authenticate('jwt', {session: false}),  fileController.ShowAll)
router.get('/search', passport.authenticate('jwt', {session: false}),  fileController.getFilesByDocument)
router.get("/local", passport.authenticate('jwt', {session: false}),  fileController.getAllLocalFiles)
router.get("/docs", passport.authenticate('jwt', {session: false}),  fileController.getDocuments)

module.exports = router;