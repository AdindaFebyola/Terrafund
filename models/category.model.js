const pool = require('../database');

async function getAllCategories() {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      name,
      icon
    FROM categories
    ORDER BY name ASC
    `
  );
  return rows;
}

module.exports = {
  getAllCategories,
};
