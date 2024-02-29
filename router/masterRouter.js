const FileController = require('../Controllers/masterController/fileMasterController')
const ReplicasController = require('../Controllers/masterController/ReplicMasterController')
const router = require('express').Router()
const passport = require('../middleware/passport')

router.post('/file/add', passport.authenticate('jwt', {session: false}),  FileController.addFileToDb)
router.post('/file/compress/add', passport.authenticate('jwt', {session: false}),  FileController.addCompressing)
router.get('/file/compress/get',passport.authenticate('jwt', {session: false}),  FileController.isExists)
router.post('/rep/add', passport.authenticate('jwt', {session: false}),  ReplicasController.addReplicInfoToDb)
router.get('')
module.exports = router