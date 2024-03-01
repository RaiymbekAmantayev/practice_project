const passport = require("passport");

const JwtStrategy = require("passport-jwt").Strategy;

const ExtractJwt = require("passport-jwt").ExtractJwt;

const axios = require("axios");
const config = {
    port: process.env.PORT,
    folder : process.env.ROOT_FOLDER,
    master: process.env.MASTER
}
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: "importantsecret", // Замените на свой секретный ключ
};


passport.use(
    new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
        try {
            const users = await axios.get(`${config.master}/api/user/get/jwt?jwtPayloadId=${jwtPayload.id}`)
            const user = users.data
            if (user) {
                return done(null, user);
            } else if(user == "user not found") {
                return done(null, false);
            }else{
                return done(null, false);
            }
        } catch (error) {
            return done(error, false);
        }
    })
);

module.exports = passport;