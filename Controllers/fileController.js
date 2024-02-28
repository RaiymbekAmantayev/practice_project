const db = require("../models");
const File = db.file;
const User = db.users
const Point = db.points
const Busboy = require('busboy');
const Compressing = db.compressing
const Replicas = db.file_replicas
const fs = require('fs');
const path = require('path');
const {Sequelize} = require("sequelize");
const axios = require("axios");
const FormData = require("form-data");
const fsPromises = require('fs').promises
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
    let pointIdArray = [];
    let fileInfoArray = [];
    let compressArray = []
    const point = await Point.findByPk(user.pointId);
    const folder = point.root_folder;

    try {
        const userId = user.id;
        req.pipe(req.busboy);

        let name, documentId
        req.busboy.on('field', (fieldname, val) => {
            if (fieldname === 'pointId') {
                pointIdArray.push(parseInt(val));
            }
            if (fieldname === 'documentId') {
                documentId = val;
            }
            if (fieldname === 'compressing') {
                compressArray.push(parseInt(val));
            }
        });

        req.busboy.on('file', async (fieldname, file, originalFilename, encoding, mimetype) => {
            try {
                fileIdCounter++;
                const folderPath = path.join(folder, documentId, fileIdCounter.toString());
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const filePath = path.join(folderPath, fileIdCounter.toString());
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);
                name = originalFilename.filename;

                const compressed = 0
                const mimeType = originalFilename.mimeType


                const fileInfoWithCompression = {
                    name,
                    file: filePath,
                    userId,
                    documentId,
                    mimeType,
                    compressed
                };
                const newFile = await File.create(fileInfoWithCompression);
                console.log("new file is: ", newFile);
                fileInfoArray.push(newFile);


                if (compressArray.length > 0) {
                    for (const fileInfo of fileInfoArray) {
                        const index = fileInfoArray.indexOf(fileInfo);
                        if (index === -1) {
                            continue;
                        }
                        const comp = compressArray[index];

                        try {
                            const existingCompress = await Compressing.findOne({
                                where: {
                                    fileId: fileInfo.id,
                                    compressingStatus: comp
                                }
                            });

                            if (!existingCompress) {
                                await Compressing.create({
                                    fileId: fileInfo.id,
                                    compressingStatus: comp
                                });
                            } else {
                                console.log("Record already exists for fileId: ", fileInfo.id, " and compressingStatus: ", comp);
                            }
                        } catch (error) {
                            console.error(`Failed to create compressing record: ${error.message}`);
                            continue;
                        }
                    }
                }


                if (pointIdArray.length > 0) {
                    const replicas = [];
                    for (const pointId of pointIdArray) {
                        for (const fileInfo of fileInfoArray) {
                                replicas.push({
                                    fileId: fileInfo.id,
                                    pointId,
                                    status: 'waiting'
                                });
                        }
                    }
                    await Replicas.bulkCreate(replicas);
                }

                const allProcessed = fileInfoArray.every(file => file.processed);
                if (allProcessed) {
                    const formData = new FormData();
                    formData.append('documentId', documentId);
                    for (const pointId of pointIdArray) {
                        formData.append('pointId', pointId);
                        console.log("pointId is", pointId);
                    }
                    let comp;
                    for (const compressing of compressArray) {
                        formData.append('compressing', compressing)
                        comp = compressing
                        console.log("compressing is: ", comp)
                    }
                    console.log(comp)
                    const fileStream = fs.createReadStream(filePath)
                    formData.append('file', fileStream);
                    // formData.append('fileId', fileIdCounter);

                    const response = await axios.post(`${point.base_url}/api/file/rep`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': req.headers.authorization,
                        },
                    });
                    if (response.status === 200) {
                        console.log("success")
                    }
                }
            } catch (error) {
                console.error('Ошибка обработки загрузки файла:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });

        req.busboy.on('finish', async () => {
            try {
                console.log('Файлы успешно сохранены в базу данных и сжаты:', fileInfoArray);

                const allProcessed = fileInfoArray.every(file => file.processed);
                if (allProcessed) {
                    res.status(200).send('Файлы успешно загружены и реплики созданы.');
                } else {
                    console.log('Все файлы еще не обработаны.');
                }
            } catch (error) {
                console.error('Ошибка при создании реплик:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });
    } catch (error) {
        console.error('Ошибка обработки запроса:', error);
        res.status(500).send({ error: 'Внутренняя ошибка сервера' });
    }
};









const addFileWithoutDb = async (req, res) => {
    try {
        req.pipe(req.busboy);

        let name, documentId, fileIds = [];

        req.busboy.on('field', (fieldname, val) => {
            if (fieldname === 'name') {
                name = val;
            } else if (fieldname === 'documentId') {
                documentId = val;
            } else if (fieldname === 'fileId') {
                fileIds.push(val);
            }
        });

        const filePromises = [];
        req.busboy.on('file', async (fieldname, file, originalFilename, encoding, mimetype) => {
            try {
                console.log('name:', name);
                console.log('documentId:', documentId);
                console.log('fileIds:', fileIds); // Используйте переданный массив id файлов

                const fileId = fileIds.shift();
                console.log(config.folder)
                console.log(documentId)
                console.log(fileId)
                const folderPath = path.join(config.folder, documentId, fileId.toString());

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const filePath = path.join(folderPath, fileId.toString());
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);
                let filename = '';
                if (originalFilename && originalFilename.filename) {
                    filename = originalFilename.filename;
                }
                filePromises.push(
                    new Promise((resolve, reject) => {
                        writeStream.on('finish', () => {
                            resolve({ fileId, filePath, filename });
                        });
                        writeStream.on('error', reject);
                    })
                );
            } catch (error) {
                console.error('Ошибка обработки загрузки файла:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
        });

        req.busboy.on('finish', async () => {
            try {
                // Дождитесь завершения всех асинхронных операций по сохранению файлов
                const uploadedFiles = await Promise.all(filePromises);

                // Вместо этого, отправка подтверждения успешной загрузки с информацией о загруженных файлах
                res.status(200).send({ success: true, uploadedFiles });
            } catch (error) {
                console.error('Ошибка при завершении:', error);
                res.status(500).send({ error: 'Внутренняя ошибка сервера' });
            }
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

const getFileById = async (req, res) => {
    try {
        const ids = req.params.id.split(','); // Assuming IDs are provided as a comma-separated string
        const files = await Promise.all(ids.map(async (id) => {
            const file = await File.findByPk(id);
            return file;
        }));

        res.send(files);
    } catch (error) {
        console.error('Error retrieving files by IDs:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    addFile,
    ShowAll,
    getFilesByDocument,
    getAllLocalFiles,
    getDocuments,
    LastFile,
    addFileWithoutDb,
    getFileById,
    // sendFileByHttp
};
