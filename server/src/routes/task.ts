// @ts-nocheck
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/task');
const { protect, scopeTenant } = require('../middleware/auth.middleware');
const router = require('express').Router();

router.use(protect, scopeTenant());
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;

export {};
