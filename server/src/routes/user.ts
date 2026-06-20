// @ts-nocheck
const { getProfile, updateProfile, deleteAccount, getAllUsers } = require('../controllers/user');
const { protect, authorize } = require('../middleware/auth.middleware');
const router = require('express').Router();

router.use(protect);
router.get('/me', getProfile);
router.put('/me', updateProfile);
router.delete('/me', deleteAccount);
router.get('/', authorize('admin', 'super_admin'), getAllUsers);

module.exports = router;

export {};
