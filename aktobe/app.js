const express = require("express");
const cors = require("cors");
const app = express();
const morgan = require("morgan");
const Port = require("./Port/Port")
// middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));
app.use("/Images", express.static("./Images"));



const PointRouter = require("./router/point_router")
const UserRouter = require("./router/user-router")
const FileRouter = require("./router/file-router")
const ReplicaseRouter = require('./router/replicase-router')

app.use("/api/point", PointRouter);
app.use("/api/user", UserRouter)
app.use("/api/file", FileRouter)
app.use("/api/rep", ReplicaseRouter)

app.listen(Port, () => {
    console.log(`Server running on port ${Port}`);
});



