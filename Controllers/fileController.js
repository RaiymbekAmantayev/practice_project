const fs = require('fs');
const path = require('path');
const axios = require("axios");
const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER,
    master: process.env.MASTER
}

const LastId = async () => {
    try {
        const filesResponse = await axios.get(`${config.master}/api/master/get/lastId`);
        const files = filesResponse.data
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


// закачивание на поинт
const addFile = async (req, res) => {
    const user = req.user;
    let pointIdArray = [];
    let fileInfoArray = [];
    let compressArray = []

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
                const folderPath = path.join(config.folder, documentId, fileIdCounter.toString());
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
                const filePath = path.join(folderPath, fileIdCounter.toString());
                const writeStream = fs.createWriteStream(filePath);

                file.pipe(writeStream);
                name = originalFilename.filename;
                const mimeType = originalFilename.mimeType

                const fileInfoWithCompression = {
                    id: fileIdCounter,
                    name,
                    file: filePath,
                    documentId,
                    mimeType,
                };
                fileInfoArray.push(fileInfoWithCompression);

                const response = await axios.post(`${config.master}/api/master/file/add`,
                    {'name': name,
                        'file': filePath,
                        'userId': userId,
                        'documentId': documentId,
                        'mimeType':mimeType
                    }, {
                    headers: {
                        'Authorization': req.headers.authorization,
                    },
                });

                if (response.status === 200) {
                    console.log("success");
                }

                if (compressArray.length > 0) {
                    for (const fileInfo of fileInfoArray) {
                        const index = fileInfoArray.indexOf(fileInfo);
                        if (index === -1) {
                            continue;
                        }
                        const comp = compressArray[index];

                        try {
                            const existingCompress = await axios.get(`${config.master}/api/master/file/compress/get?fileId=${fileInfo.id}&compressingStatus=${comp}`,{
                                headers: {
                                    'Authorization': req.headers.authorization,
                                },
                            });
                            console.log(existingCompress.data)
                            if (existingCompress.data === "file not found") {
                                console.log("запись не найдена");

                                const compressing = await axios.post(`${config.master}/api/master/file/compress/add`, {
                                    'fileId': fileInfo.id,
                                    'compressingStatus': comp
                                }, {
                                    headers: {
                                        'Authorization': req.headers.authorization,
                                    },
                                });

                                if (compressing.status === 200) {
                                    console.log("success");
                                }
                            } else {
                                console.log("запись найдена");
                            }

                        } catch (error) {
                            console.error(`Failed to create compressing record: ${error.message}`);
                            continue;
                        }
                    }
                }
                if (pointIdArray.length > 0) {
                    for (const pointId of pointIdArray) {
                        for (const fileInfo of fileInfoArray) {
                            const replicating = await axios.post(`${config.master}/api/master/rep/add`, {
                                'fileId': fileInfo.id,
                                'pointId': pointId
                            }, {
                                headers: {
                                    'Authorization': req.headers.authorization,
                                },
                            })
                            if(replicating.status === 200){
                                console.log("success")
                            }
                        }
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

                const allProcessed = true;

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
                console.log('fileIds:', fileIds);

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
                const uploadedFiles = await Promise.all(filePromises);
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


const DeleteFiles = async (req, res)=>{
    try{
        const filePath = req.body.filePath
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.status(200).send("Файл успешно удален");
        } else {
            return res.send("Файл не найден");
        }
    }catch (e){
        res.status(500).send({ error: 'Internal Server Error' });
    }
}


module.exports = {
    addFile,
    addFileWithoutDb,
    DeleteFiles
};
