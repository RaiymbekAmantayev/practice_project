module.exports = (sequelize, DataTypes) => {
    const File = sequelize.define("files", {
        name: {
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
        documentId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        mimeType:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        compressed:{
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    });
    return File;
};