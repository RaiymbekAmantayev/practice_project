const fs = require('fs')
const db = require('../models')
const File = db.file
const config = require("../Port/default.json");

class FileService {
    createFile(file){
        const filePath = `${config.filePathAktobe}\\${file.user}\\${file.path}`
        return new Promise(((resolve, reject)=>{
            try{
                if(!fs.existsSync(filePath)){
                    fs.mkdirSync(filePath)
                    return resolve({message: "file was created"})
                }else{
                    return reject({message:" file already exists"})
                }

            }catch(e){
                return reject({message:"file error"})
            }
        }))

    }
}