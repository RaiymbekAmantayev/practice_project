const fss = require('fs-extra');
const db = require('../models');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const Replicas = db.file_replicas;
const File = db.file;
const Point = db.points;
const { Op } = require("sequelize");

const ffmpeg = require("fluent-ffmpeg");
const {promises: fsPromises} = require("fs");

const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}
const compressedFilesCache = {};


async function compressVideo(filePath) {
    return new Promise((resolve, reject) => {
        const ffmpegPath = 'C:\\Ffmpeg\\ffmpeg-2024-01-28-git-e0da916b8f-full_build\\bin\\ffmpeg.exe';
        let ffmpeg = require("fluent-ffmpeg");
        ffmpeg.setFfmpegPath(ffmpegPath);

        console.log('Начало сжатия для файла:', filePath);

        const baseName = path.basename(filePath, path.extname(filePath));
        const outputFilePath = path.join(path.dirname(filePath), `${baseName}.mp4`);

        ffmpeg(filePath)
            .output(outputFilePath)
            .videoCodec('libx264')
            .noAudio()
            .size('100x100')
            .on('error', function (err) {
                console.error('Ошибка при сжатии:', err);
                reject(err);
            })
            .on('end', function () {
                console.log('Сжатие завершено для файла:', filePath);
                compressedFilesCache[filePath] = outputFilePath;
                resolve(outputFilePath);
            })
            .run();
    });
}


const SendReplicas = async (req, res, replicas, fileInfo) => {
    try {
        const infoArray = replicas.map(replica => ({
            fileId: replica.fileId,
            pointId: replica.pointId,
            status: 'waiting',
        }));

        const newReplicas = await Replicas.bulkCreate(infoArray);

        if (newReplicas && newReplicas.length > 0) {
            const replicationPromises = newReplicas.map(async replica => {
                const file = await File.findByPk(replica.fileId);
                try {
                    const stats = await fs.promises.stat(file.file);
                    console.log(stats)
                    const fileSizeInBytes = stats.size;
                    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

                    console.log('Размер файла:', fileSizeInMB, 'МБ');

                    let compressedFilePath = file.file;
                    if (fileInfo.some(info => info.originalFilename.mimeType.includes('video'))) {
                        if (fileSizeInMB >= 5) {
                            console.log('Файл больше или равен 5 МБ, будет выполнено сжатие');
                            compressedFilePath = await compressVideo(file.file);
                            compressedFilesCache[file.file] = compressedFilePath;
                        }
                    }else {
                        compressedFilePath = file.file;
                    }

                    const pointPromises = replicas.map(async replica => {
                        const point = await Point.findByPk(replica.pointId);

                        if (!point) {
                            console.error('Point not found for replica:', replica);
                            return;
                        }

                        try {
                            const formData = new FormData();
                            formData.append('documentId', file.documentId);
                            const fileStream = fs.createReadStream(compressedFilePath);
                            formData.append('fileId', file.id);
                            formData.append('file', fileStream);

                            const response = await axios.post(`${point.base_url}/api/file/rep`, formData, {
                                headers: {
                                    'Content-Type': 'multipart/form-data',
                                    'Authorization': req.headers.authorization,
                                },
                            });

                            if (response.status === 200) {
                                console.log('File replicated successfully to:', point.base_url);
                                const edited = {
                                    status: 'ready',
                                };
                                await Replicas.update(edited, { where: { fileId: replica.fileId } });
                            } else {
                                console.error('Error replicating file to remote server:', response.data);
                            }
                        } catch (error) {
                            console.error('Error replicating file to remote server:', error);
                        }
                    });

                    await Promise.all(pointPromises);
                } catch (error) {
                    console.error('Ошибка при получении информации о файле:', error);
                }
            });

            await Promise.all(replicationPromises);

            await Promise.all(newReplicas.map(async replica => {
                const file = await File.findByPk(replica.fileId);
                if (compressedFilesCache[file.file]) {
                    await fs.promises.unlink(file.file);
                }
            }));

            res.status(200).send(newReplicas);
        } else {
            res.status(500).send({ error: 'Error creating replicas' });
        }
    } catch (error) {
        console.error('Error in SendReplicas:', error);
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
    ShowByDocId,
    Replicas
}