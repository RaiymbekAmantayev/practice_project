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


const PointRouter = require("./router/point_router")
const UserRouter = require("./router/user-router")
const FileRouter = require("./router/file-router")
const ReplicaseRouter = require('./router/replicase-router')
const MasterRouter = require('./router/masterRouter')

app.use("/api/point", PointRouter);
app.use("/api/user", UserRouter)
app.use("/api/file", FileRouter)
app.use("/api/rep", ReplicaseRouter)
app.use("/api/master",MasterRouter)

app.listen(Port.Port, () => {
    console.log('Server running on port http://localhost:' + Port.Port);
});



