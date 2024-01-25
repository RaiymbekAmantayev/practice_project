const fss = require('fs-extra');
const db = require('../models');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs').promises;
const Replicas = db.file_replicas;
const File = db.file;
const Point = db.points;
const { Op } = require("sequelize");

const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}
const copyFile = async (sourcePath, destinationPath) => {
    try {
        // Получаем информацию о файле
        const sourceStats = fss.statSync(sourcePath);

        // Создаем путь для файла в директории назначения
        const fileName = path.basename(sourcePath);
        const destinationFile = path.join(destinationPath, fileName);

        // Копируем файл
        await fss.copy(sourcePath, destinationFile, { overwrite: true });

        console.log(`Файл скопирован из ${sourcePath} в ${destinationFile}`);
    } catch (error) {
        console.error(`Ошибка при копировании файла: ${error.message}`);
        throw error;
    }
};



const SendReplicas = async (req, res) => {
    try {
        const info = {
            fileId: req.body.fileId,
            pointId: req.body.pointId,
            status: 'waiting',
        };

        const newReplicas = await Replicas.create(info);

        try {
            if (newReplicas) {
                const file = await File.findByPk(req.body.fileId);
                const point = await Point.findByPk(req.body.pointId);

                if (file && point) {
                    const folderPath = path.join(config.folder, file.documentId, file.id.toString());
                    const sourcePath = path.join(folderPath, file.id.toString());
                    console.log(folderPath, sourcePath)

                    const formData = new FormData();
                    formData.append('documentId', file.documentId);
                    const fileStream = fss.createReadStream(file.file);
                    formData.append('fileId', file.id);

                    formData.append('file', fileStream);
                    console.log(formData)
                    const response = await axios.post(`${point.base_url}/api/file/rep`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': req.headers.authorization,
                        },
                    });

                    if (response.status === 200) {
                        const edited = {
                            status: 'ready',
                        };
                        await Replicas.update(edited, { where: { id: newReplicas.id } });
                        res.status(200).send(newReplicas);
                    } else {
                        res.status(500).send({ error: 'Error replicating file to remote server' });
                    }
                } else {
                    res.status(404).send({ error: 'File or point not found' });
                }
            } else {
                res.status(500).send({ error: 'Error creating replicas' });
            }
        } catch (error) {
            console.error('Error in SendReplicas:', error);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Error creating replicas:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};



const Show = async (req, res) => {
    try {
        const point = await Point.findOne({ where: { base_url: `http://127.0.0.1:${config.port}` } });
        const replicase = await Replicas.findAll({
            include: [
                {
                    model: File,
                    as: "files"
                },
                {
                    model: Point,
                    as: "points"
                }
            ]
        });

        const filteredReplicase = replicase.filter(rep => rep.pointId === point.id);

        res.send(filteredReplicase);
    } catch (error) {
        console.error('Error in Show function:', error);
        res.status(500).send('Internal Server Error');
    }
};

const ShowByDocId = async (req, res) => {
    try {
        const documentId = req.query.documentId;
        const files = await File.findAll({where:{documentId:documentId}})
        const fileIds = files.map(file => file.id);
        const point = await Point.findOne({ where: { base_url: `http://127.0.0.1:${config.port}` } });
        const replicase = await Replicas.findAll({
            where: {
                fileId: {
                    [Op.in]: fileIds
                }
            },
            include: [
                {
                    model: File,
                    as: "files"
                },
                {
                    model: Point,
                    as: "points"
                }
            ]
        });
        const filteredReplicase = replicase.filter(rep => rep.pointId === point.id);

        res.send(filteredReplicase);
    } catch (error) {
        console.error('Error in Show function:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports={
    SendReplicas,
    Show,
    ShowByDocId
}