'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('files', 'compressed', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });

    await queryInterface.addColumn('files', 'size', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('files', 'mimeType', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('files', 'compressed');
    await queryInterface.removeColumn('files', 'size');
    await queryInterface.removeColumn('files', 'mimeType');
  },
};
