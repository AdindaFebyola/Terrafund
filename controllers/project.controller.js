const Project = require('../models/project.model');
const Category = require('../models/category.model');
const slugify = require('../utils/slugify');

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.getAllProjects();
    res.json(projects);
  } catch (err) {
    console.error('getProjects error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getProjectsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const projects = await Project.getProjectsByCategory(categoryId);
    res.json(projects);
  } catch (err) {
    console.error('getProjectsByCategory error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getProjectDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.getProjectById(id);

    if (!project) {
      return res.status(404).json({ message: 'Proyek tidak ditemukan.' });
    }

    const today = new Date();
    const endDate = project.end_date ? new Date(project.end_date) : null;
    let days_remaining = null;

    if (endDate) {
      const diffMs = endDate - today;
      days_remaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    const progress_percentage = project.target_amount > 0 ? Math.round((project.current_amount / project.target_amount) * 100) : 0;

    res.json({ ...project, days_remaining, progress_percentage });
  } catch (err) {
    console.error('getProjectDetail error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.getAllCategories();
    res.json(categories);
  } catch (err) {
    console.error('getCategories error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, organization_id, category_id, description, location, duration_months, target_amount, thumbnail, banner_image, start_date, end_date } = req.body;

    if (!title || !organization_id || !category_id || !description || !target_amount) {
      return res.status(400).json({ message: 'Field wajib belum lengkap.' });
    }

    const slug = slugify(title);

    const insertId = await Project.createProject({
      title,
      slug,
      organization_id,
      category_id,
      description,
      location: location || null,
      duration_months: duration_months || null,
      target_amount,
      thumbnail: thumbnail || null,
      banner_image: banner_image || null,
      start_date: start_date || null,
      end_date: end_date || null,
    });

    const newProject = await Project.getProjectById(insertId);

    res.status(201).json(newProject);
  } catch (err) {
    console.error('createProject error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Project.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Proyek tidak ditemukan.' });
    }

    const {
      title = existing.title,
      organization_id = existing.organization_id,
      category_id = existing.category_id,
      description = existing.description,
      location = existing.location,
      duration_months = existing.duration_months,
      target_amount = existing.target_amount,
      thumbnail = existing.thumbnail,
      banner_image = existing.banner_image,
      start_date = existing.start_date,
      end_date = existing.end_date,
    } = req.body;

    const slug = slugify(title);

    const affected = await Project.updateProject(id, {
      title,
      slug,
      organization_id,
      category_id,
      description,
      location,
      duration_months,
      target_amount,
      thumbnail,
      banner_image,
      start_date,
      end_date,
    });

    if (!affected) {
      return res.status(500).json({ message: 'Gagal mengupdate proyek.' });
    }

    const updated = await Project.getProjectById(id);
    res.json(updated);
  } catch (err) {
    console.error('updateProject error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Project.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Proyek tidak ditemukan.' });
    }

    const affected = await Project.deleteProject(id);
    if (!affected) {
      return res.status(500).json({ message: 'Gagal menghapus proyek.' });
    }

    res.json({ message: 'Proyek berhasil dihapus.' });
  } catch (err) {
    console.error('deleteProject error', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};
