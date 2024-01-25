const db = require("../models");
const File = db.file;
const {compressVideo} = require("./compressVideo");
const User = db.users
const Point = db.points
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const {Sequelize} = require("sequelize");

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
        const userId = user.id;

        req.pipe(req.busboy);

        let name, documentId;

        req.busboy.on('field', (fieldname, val) => {
            if (fieldname === 'name') {
                name = val;
            } else if (fieldname === 'documentId') {
                documentId = val;
            }
        });
        req.busboy.on('file', async (fieldname, file, originalFilename, encoding, mimetype) => {
            try {
                fileIdCounter++
                console.log('name:',name);
                console.log('documentId:', documentId);
                const folderPath = path.join(config.folder, documentId, fileIdCounter.toString());
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const filePath = path.join(folderPath, fileIdCounter.toString());
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);
                name = originalFilename.filename
                writeStream.on('finish', async () => {
                    const fileInfoArray = [];
                    const fileInfo = {
                        name,
                        file: filePath,
                        userId,
                        documentId
                    };

                    const newFile = await File.create(fileInfo);
                    fileInfoArray.push(newFile);
                    console.log('Файл успешно сохранен в базу данных:', newFile);
                    res.status(200).send(fileInfoArray);
                });
            } catch (error) {
                console.error('Ошибка обработки загрузки файла:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });

        req.busboy.on('finish', () => {
            // Finalize any additional logic if needed
            console.log("success")
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};


const addFileWithoutDb = async (req, res) => {
    try {
        req.pipe(req.busboy);

        let name, documentId, fileId;

        req.busboy.on('field', (fieldname, val) => {
            if (fieldname === 'name') {
                name = val;
            } else if (fieldname === 'documentId') {
                documentId = val;
            } else if (fieldname === 'fileId') {
                fileId = val;
            }
        });
        req.busboy.on('file', async (fieldname, file, originalFilename, encoding, mimetype) => {
            try {
                console.log('name:', name);
                console.log('documentId:', documentId);
                console.log('fileId:', fileId); // Используйте переданный id файла

                const folderPath = path.join(config.folder, documentId, fileId.toString());
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const filePath = path.join(folderPath, fileId.toString());
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);
                name = originalFilename.filename;
                writeStream.on('finish', async () => {
                    // Отсутствует сохранение в базу данных

                    // Вместо этого, отправка подтверждения успешной загрузки
                    res.status(200).send('File successfully saved to folder');
                });
            } catch (error) {
                console.error('Ошибка обработки загрузки файла:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });

        req.busboy.on('finish', () => {
            // Finalize any additional logic if needed
            console.log("success");
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};


const getAllLocalFiles = async (req, res) => {
    try {
        const localFiles = await File.findAll({
            where: {
                file: {
                    [Sequelize.Op.like]: `${config.folder}%`,
                },
            },
        });

        // Обработка найденных файлов
        res.send( localFiles );
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const ShowAll = async (req, res) => {
    try {
        const files = await File.findAll({
            include: [
                {
                    model: User,
                    as: "user"
                },
            ],
        });
        res.status(200).send(files);
    } catch (err) {
        res.status(500).send("Ошибка при получении данных");
    }
};

const getFilesByDocument = async (req, res)=>{
    try{
       const documentId = req.query.documentId
       const files = await File.findAll({where:{documentId:documentId}})
        if (files) {
            res.status(200).send(files);
        } else {
            res.status(404).send("файл не найден");
        }
    }catch (err){
        res.status(500).send("Ошибка при получении данных");
    }
}

const getDocuments = async (req, res)=>{
    const distinctDocumentIds = await File.findAll({
        attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('documentId')), 'documentId'],
        ],
        where: {
            file: {
                [Sequelize.Op.like]: `${config.folder}%`,
            },
        },
    });
    res.send(distinctDocumentIds)
}

const LastFile = async (req, res)=>{
    const file = await File.findOne({ order: [['id', 'DESC']] });
    res.send(file)
}

module.exports = {
    addFile,
    ShowAll,
    getFilesByDocument,
    getAllLocalFiles,
    getDocuments,
    LastFile,
    addFileWithoutDb

};
