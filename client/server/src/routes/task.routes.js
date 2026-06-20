const router     = require('express').Router();
const ctrl       = require('../controllers/task.controller');
const { protect, scopeTenant } = require('../middleware/auth.middleware');
const validate   = require('../middleware/validate.middleware');
const V          = require('../validators/task.validator');

router.use(protect, scopeTenant());

router.get('/',    validate(V.listTasks),   ctrl.getTasks);
router.post('/',   validate(V.createTask),  ctrl.createTask);
router.put('/:id', validate(V.updateTask),  ctrl.updateTask);
router.delete('/:id', validate(V.taskParam), ctrl.deleteTask);

module.exports = router;
