const db = require("../models");
const File = db.file;
const multer = require('multer');
const path = require('path');
const {compressVideo} = require("./compressVideo");
const User = db.users
const Point = db.points
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const uuid = require("uuid");

const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}
const LastId = async () => {
    try {
        const files = await File.findOne({ order: [['id', 'DESC']] });
        console.log('files:', files); // Запись значения files
        let fileIdCounter = files ? files.id : 0;
        return fileIdCounter+1;
    } catch (error) {
        console.error('Ошибка при получении последнего fileId:', error);
        throw error;
    }
};



let fileIdCounter;
const getFieldCounter = async () => {
    fileIdCounter = await LastId();
    console.log('fieldCounter:', fileIdCounter);
};

fileIdCounter = getFieldCounter()

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            if (config.folder) {
                const documentId = req.body.documentId || 'unknown';
                const fileId = fileIdCounter++;
                const mainFolder = config.folder;
                const folderPath = path.join(mainFolder, documentId, fileId.toString());

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                cb(null, folderPath);
            } else {
                throw new Error("Folder information not found");
            }
        } catch (error) {
            cb(error, null);
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

const upload = multer({ storage: storage }).array("file", 5);

const addFile = async (req, res) => {
    const { title, documentId } = req.body;
    const user = req.user;
    const point = await Point.findOne({ where: { base_url: `http://127.0.0.1:${config.port}` } });
    const pointId = point.id;
    const userId = user.id;
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
        console.log('Files successfully saved to the database:', newFiles);
    } catch (error) {
        console.error('Error saving files to the database:', error);
        res.status(500).send({ error: 'Internal Server Error' });
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
