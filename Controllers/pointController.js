const db = require("../models");
const {Op} = require("sequelize");
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


const showPoint = async (req, res) => {
    try {
        // Получение всех точек из базы данных, исключая локальные
        const points = await Point.findAll({
            where: {
                base_url: {
                    [Op.not]: `http://127.0.0.1:${config.port}`
                },
            },
        });

        res.json(points);
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const Delete = async (req, res)=>{
    const id = req.params.id;
    await Point.destroy({where:{id:id},})
    res.send("point deleted")
}
const getPointByCode = async (req, res)=>{
    try{
        const code = req.query.code
        const point = await Point.findOne({where:{code:code}})
        if (point) {
            res.status(200).send(point);
        } else {
            res.status(404).send("Филиал не найден");
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

const getPointByCurrentService = async (req,res)=>{
    try{
        const point = await Point.findOne({where:{base_url:`http://127.0.0.1:${config.port}`}})
        res.send(point)
    }catch (e){
        console.log(e)
        res.status(500).send("Внутренняя ошибка сервера");
    }
}

module.exports = {
    addPoint,
    showPoint,
    Delete,
    getPointByCode,
    getPointByCurrentService
};