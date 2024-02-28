module.exports = (sequelize, DataTypes) => {
    const Compressing = sequelize.define("compressing", {
        fileId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "files",
                key: "id",
                unique:true
            }
        },
        compressingStatus: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: ['fileId', 'compressingStatus']
            }
        ]
    });

    return Compressing;
};
