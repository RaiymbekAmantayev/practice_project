const db = require("../../models");
const Point = db.points; // Поменял имя переменной на Point, чтобы избежать переопределения

const addPoint = async (req, res) => {
    let info = {
        code: req.body.code,
        base_url: req.body.base_url,
        root_folder: req.body.root_folder
    };
    try {
        const newPoint = await Point.create(info); // Использую новую переменную newPoint
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
}


module.exports = {
    addPoint,
    showPoint
};