const db = require("../../models");
const Replicas = db.file_replicas; // Поменял имя переменной на Point, чтобы избежать переопределения
const File = db.file
const Point = db.points
const SendReplicas = async (req, res) => {
    let info = {
        fileId: req.body.fileId,
        pointId: req.body.pointId,
        status: "waiting"
    };
    try {
        const newReplicas = await Replicas.create(info); // Использую новую переменную newPoint
        if(newReplicas){
            edited = {
                status:"ready"
            }
            await Replicas.update(edited, {where:{id:newReplicas.id}})
            replicase = await Replicas.findByPk(newReplicas.id)
            res.status(200).send(replicase);
        }
        res.status(200).send(newReplicas);
        console.log(newReplicas);
    } catch (error) {
        console.error(error);
        res.status(500).send("Ошибка при создании replicse");
    }
};
const Show = async (req, res)=>{
    const replicase = await Replicas.findAll({
        include: [
                    {
                        model: File,
                        as: "files"
                    },
                    {
                        model:Point,
                        as: "points"
                    }
                ]
        })
    res.send(replicase)
}

module.exports={
    SendReplicas,
    Show
}