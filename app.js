const express = require("express");
const cors = require("cors");
const path = require('path');
const connectBusboy = require('connect-busboy');
const Port ={
    Port: process.env.PORT,
    folder: process.env.ROOT_FOLDER
};

const app = express();
const morgan = require("morgan");



// middleware
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));
app.use(connectBusboy());
app.use(`/${Port.folder}`, express.static(path.join(__dirname, `/${Port.folder}`)));


const FileRouter = require("./router/file-router")
const ReplicROuter = require('./router/replicase-router')
app.use("/api/file", FileRouter)
app.use("/api/rep", ReplicROuter)
app.listen(Port.Port, () => {
    console.log('Server running on port http://localhost:' + Port.Port);
});



