module.exports = (sequelize, DataTypes) => {
    const File_Replicas = sequelize.define("file_replicas", {
        fileId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "files",
                key: "id",
            }
        },
        pointId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "points",
                key: "id",
            }
        },
        status:{
            type: DataTypes.STRING,
            allowNull: true,
        }
    });
    return File_Replicas;
};