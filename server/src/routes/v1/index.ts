// @ts-nocheck
const router = require('express').Router();

router.use('/auth/google',   require('../googleAuth'));
router.use('/auth',          require('../auth'));
router.use('/users',         require('../user'));
router.use('/meetings',      require('../meeting'));
router.use('/teams',         require('../team'));
router.use('/channels',      require('../channel'));
router.use('/notifications', require('../notification'));
router.use('/chat',          require('../chat'));
router.use('/ai',            require('../ai'));
router.use('/tasks',         require('../task'));
router.use('/tenants',       require('../tenant'));
router.use('/analytics',     require('../analytics'));
router.use('/export',        require('../export'));
router.use('/recordings',    require('../recording'));
router.use('/media',         require('../media'));

module.exports = router;

export {};
