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
const compressedFilesCache = {}; // Объявляем объект для хранения путей к сжатым файлам

// Функция для сжатия видео
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
                compressedFilesCache[filePath] = outputFilePath; // Сохраняем путь к сжатому файлу
                resolve(outputFilePath);
            })
            .run();
    });
}

// Функция для отправки реплик на удаленные серверы
const SendReplicas = async (req, res, replicas) => {
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

                if (!file) {
                    console.error('File not found for replica:', replica);
                    return;
                }

                if (!compressedFilesCache[file.file]) {
                    compressedFilesCache[file.file] = await compressVideo(file.file);
                }

                const compressedFilePath = compressedFilesCache[file.file];

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
            });

            await Promise.all(replicationPromises);

            // После завершения репликации на всех серверах удаляем оригинальные файлы и обновляем статус
            await Promise.all(newReplicas.map(async replica => {
                const file = await File.findByPk(replica.fileId);
                await fs.promises.unlink(file.file); // Удаление оригинального файла

                // Обновление статуса
                await Replicas.update({ status: 'ready' }, { where: { fileId: replica.fileId } });
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