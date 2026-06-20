const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const Tenant = require('../models/Tenant.model');

router.use(protect);

// Super admin: list all tenants
router.get('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const tenants = await Tenant.find().select('-__v');
    res.json(tenants);
  } catch (e) { next(e); }
});

// Tenant admin: get own tenant
router.get('/me', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (e) { next(e); }
});

// Tenant admin: update settings
router.patch('/me/settings', authorize('tenant_admin'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $set: { settings: req.body } },
      { new: true, runValidators: true }
    );
    res.json(tenant);
  } catch (e) { next(e); }
});

module.exports = router;
