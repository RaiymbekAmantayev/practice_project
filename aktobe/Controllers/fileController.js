const db = require("../../models");
const File = db.file;
const multer = require('multer');
const path = require('path');
const {compressVideo} = require("./compressVideo");
const fs = require("fs");
const PORT = require("../Port/Port")
const PORTS = require("../Port/Port");
const User = db.users
const Point = db.points
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "Images");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage: storage
}).single("file");


const addFile = async (req, res) => {
    const { title } = req.body;
    const user = req.user
    const filePath = req.file.path;
    const point = await Point.findOne({where:{base_url: `http://127.0.0.1:${PORTS}`}})
    const pointId = point.id;
    const userId = user.id
    try {
        if (pointId == user.pointId) {

            const fileInfo = {
                title,
                file: filePath,
                userId,
                pointId
            };

            const newFile = await File.create(fileInfo);
            res.status(200).send(newFile);
            console.log('Сжатое видео успешно сохранено в базе данных:', newFile);
        }
        console.log("u dont have access")

    } catch (error) {
        console.error('Ошибка при сохранении сжатого видео в базе данных:', error);
        res.status(500).send("Ошибка при сохранении сжатого видео в базе данных");
    }
};

const ShowAll = async (req, res) => {
    try {
        const point = await Point.findOne({ where: { base_url: `http://127.0.0.1:${PORTS}` }});
        const pointId = point.id;

        const files = await File.findAll({
            include: [
                {
                    model: User,
                    as: "user"
                },
                {
                    model: Point,
                    as: "points"
                }
            ],
            where: { pointId: pointId },
        });
        res.status(200).send(files);
    } catch (err) {
        res.status(500).send("Ошибка при получении данных");
    }
};


module.exports = {
    addFile,
    upload,
    ShowAll
};
