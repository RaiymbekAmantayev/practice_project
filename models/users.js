module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define("users", {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
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
    return Users;
};