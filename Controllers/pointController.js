const db = require("../models");
const Point = db.points; // Поменял имя переменной на Point, чтобы избежать переопределения
const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}

const addPoint = async (req, res) => {
    let info = {
        code: req.body.code,
        base_url:  `http://127.0.0.1:${config.port}`,
        root_folder: req.body.root_folder
    };
    try {
        const newPoint = await Point.create(info);
        res.status(200).send(newPoint);
        console.log(newPoint);
    } catch (error) {
        console.error(error);
        res.status(500).send("Ошибка при создании point");
    }
};


const showPoint = async (req, res)=> {
    const point = await Point.findAll()
    res.send(point)
    console.log(config.port)
}

const Delete = async (req, res)=>{
    const id = req.params.id;
    await Point.destroy({where:{id:id},})
    res.send("point deleted")
}

module.exports = {
    addPoint,
    showPoint,
    Delete
};