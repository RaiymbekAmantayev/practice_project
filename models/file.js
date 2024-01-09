module.exports = (sequelize, DataTypes) => {
    const File = sequelize.define("files", {
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "users",
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
    });
    return File;
};