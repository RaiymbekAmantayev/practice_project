const db = require("../../models");
const File = db.file;
const User = db.users
const Replicas = db.file_replicas
const Point = db.points
const addReplicInfoToDb = async (req, res)=>{
    try {
        const info = {
            fileId: req.body.fileId,
            pointId:req.body.pointId,
            status: "waiting"
        }
        const promises = []
        promises.push(Replicas.create(info))
        const newFile = await Promise.all(promises);
        return res.status(200).send(newFile);
    }catch (e){
        return res.status(500).send("error ",e)
    }
}

module.exports={
    addReplicInfoToDb
}