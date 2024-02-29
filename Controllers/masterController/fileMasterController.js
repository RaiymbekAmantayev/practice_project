const db = require("../../models");
const File = db.file;
const Compress = db.compressing
const Replicas = db.file_replicas
const Point = db.points

const addFileToDb = async (req, res) => {
    try {
        console.log(req.body.name)
        console.log(req.body.file)
        console.log(req.body.userId)
        console.log(req.body.documentId)
        console.log(req.body.mimeType)
        const info = {
            name: req.body.name,
            file: req.body.file,
            userId: req.body.userId,
            documentId: req.body.documentId,
            mimeType: req.body.mimeType,
            compressed: 0
        };

        // Создаем массив обещаний для операции создания файла
        const promises = [];

        // Добавляем обещание в массив
        promises.push(File.create(info));

        // Ожидаем завершения операции создания файла
        const newFile = await Promise.all(promises);

        // Отправляем результат клиенту
        return res.status(200).send(newFile);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
};



const addCompressing = async (req, res) => {
    try {
        // Получаем информацию из запроса
        const { fileId, compressingStatus } = req.body;

        // Создаем массив обещаний для операций создания
        const promises = [];

        // Добавляем обещание в массив для каждой записи, которую нужно создать
        promises.push(Compress.create({fileId: fileId, compressingStatus:compressingStatus}));

        // Ждем завершения всех операций создания с помощью Promise.all()
        const newCompressions = await Promise.all(promises);

        // Отправляем созданные записи клиенту
        return res.send(newCompressions);
    } catch (error) {
        // Если возникла ошибка, отправляем ее клиенту
        console.error(error);
        return res.status(500).send("Ошибка сервера");
    }
};


const isExists = async (req, res) => {
    try {
        const fileId = req.query.fileId;
        const compressingStatus = req.query.compressingStatus;
        const compress = await Compress.findOne({ where: { fileId: fileId, compressingStatus: compressingStatus } });

        if (!compress) {
            return res.send("file not found");
        }

        return res.send(compress);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Internal Server Error");
    }
};


module.exports={
    addFileToDb,
    addCompressing,
    isExists
}
