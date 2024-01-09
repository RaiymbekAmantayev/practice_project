const db = require("../../models");
const File = db.file;
const multer = require('multer');
const path = require('path');
const {compressVideo} = require("./compressVideo");
const fs = require("fs");



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
    const { title, pointId } = req.body;
    const userId = req.user.id;
    const filePath = req.file.path;

    try {
        if (pointId == userId) {
            // Сжатие видеофайла

            // Сохранение информации о сжатом файле в базе данных
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
    } catch (error) {
        console.error('Ошибка при сохранении сжатого видео в базе данных:', error);
        res.status(500).send("Ошибка при сохранении сжатого видео в базе данных");
    }
};

module.exports = {
    addFile,
    upload
};
