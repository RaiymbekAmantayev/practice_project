const db = require("../models");
const File = db.file;
const {compressVideo} = require("./compressVideo");
const User = db.users
const Point = db.points
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}
const LastId = async () => {
    try {
        const files = await File.findOne({ order: [['id', 'DESC']] });
        console.log('files:', files);
        let fileIdCounter = files ? files.id : 0;
        return fileIdCounter ;
    } catch (error) {
        console.error('Error getting the last fileId:', error);
        throw error;
    }
};

let fileIdCounter;

const getFieldCounter = async () => {
    fileIdCounter = await LastId();
    console.log('fieldCounter:', fileIdCounter);
};

fileIdCounter=getFieldCounter();

const addFile = async (req, res) => {
    const user = req.user;

    try {
        const point = await Point.findOne({ where: { base_url: `http://127.0.0.1:${config.port}` } });
        const pointId = point.id;
        const userId = user.id;

        req.pipe(req.busboy);

        let title, documentId;

        req.busboy.on('field', (fieldname, val) => {
            if (fieldname === 'title') {
                title = val;
            } else if (fieldname === 'documentId') {
                documentId = val;
            }
        });
        req.busboy.on('file', async (fieldname, file, originalFilename, encoding, mimetype) => {
            try {
                fileIdCounter++
                console.log('title:', title);
                console.log('documentId:', documentId);
                const folderPath = path.join(config.folder, documentId, fileIdCounter.toString());
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                // Прямо используйте оригинальное имя файла без использования path.parse
                const filePath = path.join(folderPath, originalFilename.filename);
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);

                writeStream.on('finish', async () => {
                    const fileInfo = {
                        title,
                        file: filePath,
                        userId,
                        pointId,
                    };

                    const newFile = await File.create(fileInfo);

                    console.log('Файл успешно сохранен в базу данных:', newFile);
                });
            } catch (error) {
                console.error('Ошибка обработки загрузки файла:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });

        req.busboy.on('finish', () => {
            // Finalize any additional logic if needed
            res.status(200).send('File uploaded successfully!');
        });
    } catch (error) {
        console.error('Error processing request:', error);
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
    ShowAll
};
