const express = require("express");
const cors = require("cors");
// const config = require("./Port/default.json")
const config = require("./Port/default.json");
const Port = config.PortAktobe; // Access the Port property directly

// Rest of your code...

const app = express();
const morgan = require("morgan");

// middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));



const PointRouter = require("./router/point_router")
const UserRouter = require("./router/user-router")
const FileRouter = require("./router/file-router")
const ReplicaseRouter = require('./router/replicase-router')

app.use("/api/point", PointRouter);
app.use("/api/user", UserRouter)
app.use("/api/file", FileRouter)
app.use("/api/rep", ReplicaseRouter)

app.listen(Port, () => {
    console.log('Server running on port http://localhost:' + Port);
});



