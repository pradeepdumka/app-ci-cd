const express = require('express');
const { adminSummary, deleteUser, listUsers } = require('../controllers/userController');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/summary', adminSummary);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);

module.exports = router;
