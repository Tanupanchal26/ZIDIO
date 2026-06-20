// @ts-nocheck
const router   = require('express').Router();
const ctrl     = require('../controllers/channel');
const { protect, scopeTenant, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants');
const validate = require('../middleware/validate.middleware');
const V        = require('../validators/channel.validator');

router.use(protect, scopeTenant());

router.get('/:id',      validate(V.channelParam), ctrl.getChannel);
router.put('/:id',      authorize(ROLES.ADMIN), validate(V.updateChannel), ctrl.updateChannel);
router.delete('/:id',   authorize(ROLES.ADMIN), validate(V.channelParam), ctrl.archiveChannel);

// Messages
router.get('/:id/messages',              validate(V.listMessages), ctrl.getMessages);
router.post('/:id/messages',             validate(V.sendMessage),  ctrl.sendMessage);
router.put('/:id/messages/:msgId',       validate(V.editMessage),  ctrl.editMessage);
router.delete('/:id/messages/:msgId',    validate(V.editMessage),  ctrl.deleteMessage);
router.post('/:id/messages/:msgId/react',validate(V.reaction),     ctrl.toggleReaction);
router.post('/:id/messages/:msgId/pin',  validate(V.reaction.params ? V.reaction : V.channelParam), ctrl.pinMessage);
router.delete('/:id/messages/:msgId/pin',                          ctrl.unpinMessage);

module.exports = router;

export {};
