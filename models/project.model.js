const pool = require('../database');

async function getAllProjects() {
  const [rows] = await pool.query(
    `
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.current_amount,
      p.target_amount,
      p.thumbnail,
      o.name AS organization_name,
      c.name AS category_name
    FROM projects p
    JOIN organizations o ON p.organization_id = o.id
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
    `
  );
  return rows;
}

async function getProjectsByCategory(categoryId) {
  const [rows] = await pool.query(
    `
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.current_amount,
      p.target_amount,
      p.thumbnail,
      o.name AS organization_name,
      c.name AS category_name
    FROM projects p
    JOIN organizations o ON p.organization_id = o.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ?
    ORDER BY p.created_at DESC
    `,
    [categoryId]
  );
  return rows;
}

async function getProjectById(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      p.*,
      o.name AS organization_name,
      c.name AS category_name
    FROM projects p
    JOIN organizations o ON p.organization_id = o.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
    `,
    [id]
  );
  return rows[0] || null;
}

async function createProject(data) {
  const { title, slug, organization_id, category_id, description, location, duration_months, target_amount, thumbnail, banner_image, start_date, end_date } = data;

  const [result] = await pool.query(
    `
    INSERT INTO projects (
      title, slug, organization_id, category_id, description,
      location, duration_months, target_amount, current_amount,
      donor_count, thumbnail, banner_image, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `,
    [title, slug, organization_id, category_id, description, location, duration_months, target_amount, thumbnail, banner_image, start_date, end_date]
  );

  return result.insertId;
}

// UPDATE
async function updateProject(id, data) {
  const { title, slug, organization_id, category_id, description, location, duration_months, target_amount, thumbnail, banner_image, start_date, end_date } = data;

  const [result] = await pool.query(
    `
    UPDATE projects
    SET
      title = ?,
      slug = ?,
      organization_id = ?,
      category_id = ?,
      description = ?,
      location = ?,
      duration_months = ?,
      target_amount = ?,
      thumbnail = ?,
      banner_image = ?,
      start_date = ?,
      end_date = ?
    WHERE id = ?
    `,
    [title, slug, organization_id, category_id, description, location, duration_months, target_amount, thumbnail, banner_image, start_date, end_date, id]
  );

  return result.affectedRows; // 0 kalau tidak ada, 1 kalau sukses
}

// DELETE
async function deleteProject(id) {
  const [result] = await pool.query(
    `
    DELETE FROM projects
    WHERE id = ?
    `,
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  getAllProjects,
  getProjectsByCategory,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
