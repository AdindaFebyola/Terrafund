const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getProjects);
router.get('/categories', projectController.getCategories);
router.get('/category/:categoryId', projectController.getProjectsByCategory);
router.get('/:id', projectController.getProjectDetail);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
