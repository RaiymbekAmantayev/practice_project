const db = require("../models");
const File = db.file;
const multer = require('multer');
const path = require('path');
const {compressVideo} = require("./compressVideo");
const User = db.users
const Point = db.points
const config = require("../Port/default.json");
const Port = config.PortAktobe;

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const user = req.user;
        const pointId = user.pointId
        const folderInfo = await Point.findByPk(pointId);
        if (folderInfo) {
            const userId = user.id;
            const mainFolder = folderInfo.root_folder;
            const subFolder = userId.toString();
            const folderPath = path.join(mainFolder, subFolder);

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }

            cb(null, folderPath);
        } else {
            cb(new Error("Folder information not found"), null);
        }
    },
    filename: (req, file, cb) => {
        if (file) {
            cb(null, Date.now() + "-" + file.originalname);
        } else {
            cb(new Error("File is undefined"), null);
        }
    }
});

const upload = multer({
    storage: storage
}).array("file", 5);

// Import necessary modules
const fs = require('fs');

// Rest of your code...


// Rest of your code...



const addFile = async (req, res) => {
    const { title } = req.body;
    const user = req.user
    const point = await Point.findOne({where:{base_url: `http://127.0.0.1:${Port}`}})
    const pointId = point.id;
    const userId = user.id
    const files = req.files;
    try {
    const filePromises = files.map(async (file) => {
        const fileInfo = {
            title,
            file: file.path,
            userId,
            pointId,
        };

        return await File.create(fileInfo);
    });


    const newFiles = await Promise.all(filePromises);

    res.status(200).send(newFiles);
    console.log('Сжатое видео успешно сохранено в базе данных:', newFile);
        console.log("u dont have access")

    } catch (error) {
        console.error('Ошибка при сохранении сжатого видео в базе данных:', error);
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
