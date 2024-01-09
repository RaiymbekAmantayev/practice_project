const fs = require('fs-extra');
const sharp = require('sharp');

async function compressVideo(inputPath) {
    const outputPath = 'C:/Users/User/Desktop/videoService/almaty/Videos/compressedVideo.mp4';

    try {
        // Чтение видеофайла
        const videoBuffer = await fs.readFile(inputPath);

        // Сжатие видео с помощью sharp
        const compressedVideoBuffer = await sharp(videoBuffer)
            .resize({ width: 1280, height: 720, fit: 'inside' })
            .toBuffer();

        // Запись сжатого видеофайла
        await fs.writeFile(outputPath, compressedVideoBuffer);

        console.log('Видео успешно сжато:', outputPath);
        return outputPath;
    } catch (error) {
        console.error('Ошибка при сжатии видео:', error);
        return null;
    }
}

async function compressImage(inputPath, outputPath, width, height) {
    try {
        await sharp(inputPath)
            .resize(width, height)
            .toFile(outputPath);

        console.log('Изображение успешно сжато:', outputPath);
        return outputPath; // Возвращаем путь к сжатому изображению
    } catch (error) {
        console.error('Ошибка при сжатии изображения:', error);
        return null;
    }
}
module.exports = {
    compressVideo,
    compressImage
};
