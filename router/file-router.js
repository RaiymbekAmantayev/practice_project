const fileController = require('../Controllers/fileController')
const router = require('express').Router()
const passport = require('../middleware/passport')

router.post('/add', passport.authenticate('jwt', {session: false}),  fileController.addFile)
router.post('/rep', fileController.addFileWithoutDb)

module.exports = router;