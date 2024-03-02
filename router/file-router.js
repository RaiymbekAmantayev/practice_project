const fileController = require('../Controllers/fileController')
const router = require('express').Router()
const passport = require('../middleware/passport')



// обработка данных для пойнтов
router.post('/add', passport.authenticate('jwt', {session: false}),  fileController.addFile)
// обработка данных для репликации
router.post('/rep', fileController.addFileWithoutDb)

module.exports = router;