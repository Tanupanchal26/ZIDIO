const router = require('express').Router();

router.use('/auth/google',   require('../googleAuth.routes'));
router.use('/auth',          require('../auth.routes'));
router.use('/users',         require('../user.routes'));
router.use('/meetings',      require('../meeting.routes'));
router.use('/teams',         require('../team.routes'));
router.use('/channels',      require('../channel.routes'));
router.use('/notifications', require('../notification.routes'));
router.use('/chat',          require('../chat.routes'));
router.use('/ai',            require('../ai.routes'));
router.use('/tasks',         require('../task.routes'));
router.use('/tenants',       require('../tenant.routes'));
router.use('/analytics',     require('../analytics.routes'));
router.use('/export',        require('../export.routes'));
router.use('/recordings',    require('../recording.routes'));
router.use('/media',         require('../media.routes'));

module.exports = router;
