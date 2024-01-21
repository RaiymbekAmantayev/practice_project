'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('files', 'title', 'name');
    await queryInterface.renameColumn('files', 'pointId', 'documentId');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('files', 'name', 'title');
    await queryInterface.renameColumn('files', 'documentId', 'pointId');
  }
};
