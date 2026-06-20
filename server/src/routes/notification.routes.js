const router   = require('express').Router();
const ctrl     = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const V        = require('../validators/notification.validator');

router.use(protect);

router.get('/',              validate(V.listNotifications), ctrl.getNotifications);
router.post('/read-all',                                    ctrl.markAllRead);
router.patch('/:id/read',    validate(V.notifParam),        ctrl.markRead);
router.delete('/:id',        validate(V.notifParam),        ctrl.deleteNotification);

module.exports = router;
