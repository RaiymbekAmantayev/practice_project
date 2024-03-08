const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const {promises: fsPromises} = require("fs");

const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER,
    master: process.env.MASTER
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
                    const response = await axios.put(`${config.master}/api/master/file/compress?filePath=${filePath}`);
                    if(response.status == 200) {
                        console.log('Запись в базе данных обновлена для файла:', filePath);
                    }
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


const MAX_REPLICATION_ATTEMPTS = 2
let typeError = null
let typeErrorCompress = null
const processReplication = async () => {
    try {
        const replicas = await axios.get(`${config.master}/api/master/rep/get/wait`);
        console.log(replicas.data);

        if (replicas.data == "replic not found") {
            console.log('Нет файлов для репликации со статусом "waiting"');
            return;
        }

        for (const replica of replicas.data) {
            let replicationAttempts = 0;
            let replicationSuccessful = false;

            while (!replicationSuccessful && replicationAttempts <= MAX_REPLICATION_ATTEMPTS) {
                const files = await axios.get(`${config.master}/api/master/file/${replica.fileId}`);
                const points = await axios.get(`${config.master}/api/point/get/${replica.pointId}`);
                console.log(points);
                console.log(files);
                const file = files.data;
                const point = points.data;

                if (!file) {
                    console.error('Файл с ID', replica.fileId, 'не найден в базе данных');
                    break;
                }

                let compressedFilePath = file.file;
                const compress = await axios.get(`${config.master}/api/master/compress/status?fileId=${file.id}`);
                const compressing = compress.data;
                try{
                    if (compressing && compressing.compressingStatus === 1 && file.mimeType.includes('video') && file.compressed === 0) {
                        compressedFilePath = await compressVideo(file.file);
                        compressedFilesCache[file.file] = compressedFilePath;
                        console.log("compressing requires");
                    }
                }catch (error){
                    const errorMessage = error.message;
                    const wordsArray = errorMessage.split(' ');
                    const firstFourWords = wordsArray.slice(0, 4);
                    console.error('Ошибка при отправке файла на репликацию:', firstFourWords.join(' '));
                    typeErrorCompress = firstFourWords.join(' ');
                    compressedFilePath = null
                }
                
                const formData = new FormData();
                formData.append('documentId', file.documentId);
                const fileStream = fs.createReadStream(compressedFilePath);
                formData.append('fileId', file.id);
                formData.append('file', fileStream);

                try {
                    const response = await axios.post(`${point.base_url}/api/file/rep`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    if (response.status === 200) {
                        const newStatus = await axios.put(`${config.master}/api/master/rep/update/${replica.id}`);
                        if (newStatus.status === 200) {
                            console.log('Файл успешно реплицирован:', file.name);
                            replicationSuccessful = true;
                        }
                    }
                } catch (error) {
                    const errorMessage = error.message;
                    const wordsArray = errorMessage.split(' ');
                    const firstFourWords = wordsArray.slice(0, 4);
                    console.error('Ошибка при отправке файла на репликацию:', firstFourWords.join(' '));
                    if (firstFourWords.join(' ') !== "Request failed with status"){
                        typeError = firstFourWords.join(' ');
                    }
                }


                replicationAttempts++;
            }

            if (!replicationSuccessful) {
                if(typeError){
                    const addMonitoring = await axios.post(`${config.master}/api/monitoring/add`,{fileId:replica.fileId, ReplicasId:replica.id, typeError: typeError});
                    console.log(addMonitoring.status)
                }
                if(typeErrorCompress){
                    const addMonitoring = await axios.post(`${config.master}/api/monitoring/add`,{fileId:replica.fileId,ReplicasId:replica.id,typeError: typeErrorCompress});
                    console.log(addMonitoring.status)
                }
                if(typeErrorCompress || typeError){
                    const newError = await axios.put(`${config.master}/api/master/rep/update/error/${replica.id}`);
                    console.log("fileId is ",replica.fileId)
                    console.log("error status: ", newError.status);
                }
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


// const compressLocalFiles = async ()=>{
//     try{
//         const compressing = await Compressing.findOne({where:{compressingStatus:1}})
//         const files = await File.findOne({where:{compressed: 0}})
//         if(!files.length && !compressing.length){
//             console.log('нет файлы которые нужно сжать');
//             return;
//         }
//         for(const file of files){
//             const fileId = file.id
//             const replicFile = Replicas.findAll({where:{fileId: fileId}})
//             if(replicFile.length > 0 ){
//                 console.log('Файлы для сжатие уже существуют в репликации');
//                 return;
//             }
//             let compressedFilePath = file.file;
//             const compressing = await Compressing.findOne({where:{fileId:file.id}})
//             if (compressing.compressingStatus == 1 && file.mimeType.includes('video')) {
//                 compressedFilePath = await compressVideo(file.file);
//                 compressedFilesCache[file.file] = compressedFilePath;
//             }
//             console.log(compressedFilePath, "удачно сжался")
//         }
//     }catch (error){
//         console.log("error ",error)
//     }
// }
//
// const startCompressing = async () => {
//     console.log('Запуск процесса обработки сжатие локальных файлов...');
//     await compressLocalFiles();
//
//     setTimeout(startCompressing, 5000);
// };

// startCompressing();

