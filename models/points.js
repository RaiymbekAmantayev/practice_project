module.exports = (sequelize, DataTypes) => {
    const Points = sequelize.define("points", {
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        base_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        root_folder: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });
    return Points;
}