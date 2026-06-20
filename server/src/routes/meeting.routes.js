const router     = require('express').Router();
const ctrl       = require('../controllers/meeting.controller');
const { protect, scopeTenant, authorize, roleGuard } = require('../middleware/auth.middleware');
const validate   = require('../middleware/validate.middleware');
const V          = require('../validators/meeting.validator');

router.use(protect, scopeTenant());

router.post('/',      validate(V.createMeeting),     ctrl.createMeeting);
router.get('/',       validate(V.listMeetings),       ctrl.listMeetings);
router.get('/:id',    validate(V.getMeeting),         ctrl.getMeeting);
router.put('/:id',    validate(V.updateMeeting),      ctrl.updateMeeting);
router.delete('/:id', authorize(ROLES.ADMIN), validate(V.getMeeting), ctrl.deleteMeeting);

router.post('/:id/invite',  validate(V.inviteParticipants), ctrl.inviteParticipants);
router.post('/:id/rsvp',    validate(V.respondToInvite),    ctrl.respondToInvite);
router.post('/:id/start',   validate(V.getMeeting),         ctrl.startMeeting);
router.post('/:id/end', authorize(ROLES.ADMIN), validate(V.getMeeting), ctrl.endMeeting);

// Meeting notes
router.get('/:id/notes',  validate(V.getMeeting),  ctrl.getMeetingNote);
router.put('/:id/notes',  validate(V.upsertNote),  ctrl.upsertMeetingNote);

module.exports = router;
