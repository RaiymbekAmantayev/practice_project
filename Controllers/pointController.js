const db = require("../models");
const Point = db.points; // Поменял имя переменной на Point, чтобы избежать переопределения
const config = require("../Port/default.json");
const Port = config.PortAktobe;
const addPoint = async (req, res) => {
    let info = {
        code: req.body.code,
        base_url:  `http://127.0.0.1:${Port}`,
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
    console.log(PORTS)
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