const router   = require('express').Router();
const ctrl     = require('../controllers/team.controller');
const { protect, scopeTenant } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const V        = require('../validators/team.validator');

// Channel routes nested under team
const channelCtrl = require('../controllers/channel.controller');
const CV          = require('../validators/channel.validator');

router.use(protect, scopeTenant());

router.post('/',   validate(V.createTeam), ctrl.createTeam);
router.get('/',                            ctrl.listTeams);
router.get('/:id', validate(V.teamParam),  ctrl.getTeam);
router.put('/:id', validate(V.updateTeam), ctrl.updateTeam);
router.delete('/:id', validate(V.teamParam), ctrl.deleteTeam);

// Member management
router.post('/:id/members',              validate(V.inviteMember),     ctrl.inviteMember);
router.delete('/:id/members/:userId',    validate(V.memberParam),      ctrl.removeMember);
router.patch('/:id/members/:userId/role',validate(V.updateMemberRole), ctrl.updateMemberRole);

// Channels nested under team
router.post('/:teamId/channels',   validate(CV.createChannel), channelCtrl.createChannel);
router.get('/:teamId/channels',                                channelCtrl.listChannels);

module.exports = router;
