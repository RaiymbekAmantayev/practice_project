const db = require("../models");
const Users = db.users;
const bcrypt = require("bcrypt");
const { sign } = require("jsonwebtoken");
const Point = db.points
const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER
}
const Auth = async(req, res) => {
    const { email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const point = await Point.findOne({where:{base_url: `http://127.0.0.1:${config.port}`}})
        const pointId = point.id;
        const newUser = await Users.create({
            email: email,
            password: hash,
            pointId: pointId
        });
        const userId = newUser.id;
        res.json({ message: "Success", userId });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};
const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ where: { email: email } });

        if (!user) {
            return res.json({ error: "User doesn't exist" });
        }

        bcrypt.compare(password, user.password).then((match) => {
            if (!match) {
                return res.json({ error: "Wrong username and password combination" });
            }
            const accessToken = sign({username:user.username, id:user.id},
                "importantsecret");
            return  res.send({
                user: user,
                token: accessToken
            });
        })
            .catch((error) => {
                console.error(error);
                return res.json({ error: "Error comparing passwords" });
            });
    } catch (error) {
        console.error(error);
        return res.json({ error: "Internal server error" });
    }
};

module.exports={
    Auth,
    Login
}