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


const compressVideo = (filePath) => {
    return new Promise((resolve, reject) => {
        const ffmpegPath = 'C:\\Ffmpeg\\ffmpeg-2024-01-28-git-e0da916b8f-full_build\\bin\\ffmpeg.exe';
        const ffmpeg = require("fluent-ffmpeg");
        const path = require("path");
        const fs = require("fs");

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
            .on('end', async function () {
                console.log('Сжатие завершено для файла:', filePath);

                try {
                    // Обновление записи в базе данных для указания, что файл сжат
                    await File.update({ compressed: 1 }, { where: { file: filePath } });
                    console.log('Запись в базе данных обновлена для файла:', filePath);

                    // Удаляем оригинальный файл
                    await fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Ошибка при удалении оригинального файла:', err);
                            reject(err);
                        } else {
                            console.log('Оригинальный файл удален:', filePath);
                        }
                    });

                    // Убираем расширение у сжатого файла
                    const outputFileNameWithoutExtension = path.join(path.dirname(filePath), baseName);
                    fs.rename(outputFilePath, outputFileNameWithoutExtension, (err) => {
                        if (err) {
                            console.error('Ошибка при удалении расширения у сжатого файла:', err);
                            reject(err);
                        } else {
                            console.log('Расширение у сжатого файла удалено:', outputFileNameWithoutExtension);
                            resolve(outputFileNameWithoutExtension);
                        }
                    });
                } catch (error) {
                    console.error('Ошибка при удалении файла или обновлении записи в базе данных:', error);
                    reject(error);
                }
            })
            .run();
    });
};


const processReplication = async () => {
    try {
        const replicas = await Replicas.findAll({
            where: { status: 'waiting' },
            limit: 10
        });

        if (!replicas.length) {
            console.log('Нет файлов для репликации со статусом "waiting"');
            return;
        }

        for (const replica of replicas) {
            const file = await File.findByPk(replica.fileId);
            const point = await Point.findByPk(replica.pointId);

            if (!file) {
                console.error('Файл с ID', replica.fileId, 'не найден в базе данных');
                continue;
            }

            let compressedFilePath = file.file;
            if (file.compressing == 1 && file.mimeType.includes('video') && file.compressed == 0) {
                compressedFilePath = await compressVideo(file.file);
                compressedFilesCache[file.file] = compressedFilePath;
                console.log("compressing requires")
            }

            const formData = new FormData();
            formData.append('documentId', file.documentId);
            const fileStream = fs.createReadStream(compressedFilePath);
            formData.append('fileId', file.id);
            formData.append('file', fileStream);

            const response = await axios.post(`${point.base_url}/api/file/rep`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.status === 200) {
                await Replicas.update({ status: 'ready' }, { where: { id: replica.id } });
                console.log('Файл успешно реплицирован:', file.name);
            }
        }

        console.log('Репликация файлов успешно обработана');
    } catch (error) {
        console.error('Ошибка в processReplication:', error);
    }
};

const startReplicationProcess = async () => {
    console.log('Запуск процесса обработки репликации файлов...');
    await processReplication();
    setTimeout(startReplicationProcess, 15000);
};

startReplicationProcess();


const compressLocalFiles = async ()=>{
    try{
        const files = await File.findAll({where:{compressing:1, compressed: 0}})
        if(!files.length){
            console.log('нет файлы которые нужно сжать');
            return;
        }
        for(const file of files){
            const fileId = file.id
            const replicFile = Replicas.findAll({where:{fileId: fileId}})
            if(replicFile.length > 0 ){
                console.log('Файлы для сжатие уже существуют в репликации');
                return;
            }
            let compressedFilePath = file.file;
            if (file.compressing == 1 && file.mimeType.includes('video')) {
                compressedFilePath = await compressVideo(file.file);
                compressedFilesCache[file.file] = compressedFilePath;
            }
            console.log(compressedFilePath, "удачно сжался")
        }
    }catch (error){
        console.log("error ",error)
    }
}

const startCompressing = async () => {
    console.log('Запуск процесса обработки сжатие локальных файлов...');
    await compressLocalFiles();

    setTimeout(startCompressing, 5000);
};

startCompressing();



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
    Show,
    ShowByDocId,
    Replicas
}