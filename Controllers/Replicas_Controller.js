const fs = require('fs-extra');
const db = require('../models');
const path = require('path');
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
        const sourceStats = fs.statSync(sourcePath);

        // Создаем путь для файла в директории назначения
        const fileName = path.basename(sourcePath);
        const destinationFile = path.join(destinationPath, fileName);

        // Копируем файл
        await fs.copy(sourcePath, destinationFile, { overwrite: true });

        console.log(`Файл скопирован из ${sourcePath} в ${destinationFile}`);
    } catch (error) {
        console.error(`Ошибка при копировании файла: ${error.message}`);
        throw error;
    }
};


const SendReplicas = async (req, res) => {
    let info = {
        fileId: req.body.fileId,
        pointId: req.body.pointId,
        status: 'waiting',
    };
        const newReplicas = await Replicas.create(info);
        try{
            if (newReplicas) {
                const replicase = await Replicas.findByPk(newReplicas.id);

                const file = await File.findByPk(req.body.fileId);
                const point = await Point.findByPk(req.body.pointId)

                if (file && point) {
                    const folderPath = path.join(config.folder, file.documentId, file.id.toString());
                    const sourcePath = path.join(folderPath, file.id.toString());
                    const destinationPath = path.join(point.root_folder, file.documentId, file.id.toString()) // Используйте root_folder для директории

                    console.log(destinationPath);
                    await copyFile(sourcePath, destinationPath);
                }
                const edited = {
                    status: 'ready',
                };
                await Replicas.update(edited, {where: {id: newReplicas.id}});

                res.status(200).send(replicase);

            } else {
                res.status(200).send(newReplicas);
            }

            console.log(newReplicas);
        }catch (e){
            console.log(e)
        }

}


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