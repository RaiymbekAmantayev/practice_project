const dbConfig = require('../config/config.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD, {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle
        }
    }
);

sequelize.authenticate()
    .then(() => {
        console.log('connected..');
    })
    .catch(err => {
        console.log('Error' + err);
    });

const db = {};


db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.points = require("./points")(sequelize,DataTypes)
db.users =require("./users")(sequelize, DataTypes)
db.file = require("./file")(sequelize,DataTypes)
db.file_replicas = require("./file_replicas")(sequelize,DataTypes)

db.sequelize.sync({ force: false })
    .then(() => {
        console.log('yes re-sync done!')
    })

// Установка ассоциаций
// ----------user relations
db.points.hasMany(db.users, {
    foreignKey: 'pointId',
    as: 'user'
});

db.users.belongsTo(db.points, {
    foreignKey: 'pointId',
    as: 'points'
});
// ----------file relations
// ---users
db.users.hasMany(db.file, {
    foreignKey: 'userId',
    as: 'file'
});

db.file.belongsTo(db.users, {
    foreignKey: 'userId',
    as: 'user'
});
// points
db.points.hasMany(db.file, {
    foreignKey: 'pointId',
    as: 'file'
});

db.file.belongsTo(db.points, {
    foreignKey: 'pointId',
    as: 'points'
});

// replicas
// В модели file
db.file.hasMany(db.file_replicas, { foreignKey: 'fileId', as: 'file_replicas' });
db.file_replicas.belongsTo(db.file, { foreignKey: 'fileId', as: 'files' });

// points
db.points.hasMany(db.file_replicas, {foreignKey: 'pointId', as: 'file_replicas'});
db.file_replicas.belongsTo(db.points, {foreignKey: 'pointId', as: 'points'});
module.exports = db;