const express = require('express');
const router = express.Router();
const { verifyAdminOrManager } = require('../middleware/authMiddleware');
const AutomaticTriggerService = require('../services/automaticTriggerService');

// GET /api/automatic-triggers/status - Get status of automatic triggers
router.get('/status', verifyAdminOrManager, (req, res) => {
  try {
    const status = AutomaticTriggerService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get automatic trigger status',
      error: error.message
    });
  }
});

// POST /api/automatic-triggers/start - Start automatic triggers
router.post('/start', verifyAdminOrManager, (req, res) => {
  try {
    AutomaticTriggerService.startAutomaticTriggers();
    res.json({
      success: true,
      message: 'Automatic triggers started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start automatic triggers',
      error: error.message
    });
  }
});

// POST /api/automatic-triggers/stop - Stop automatic triggers
router.post('/stop', verifyAdminOrManager, (req, res) => {
  try {
    AutomaticTriggerService.stopAutomaticTriggers();
    res.json({
      success: true,
      message: 'Automatic triggers stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop automatic triggers',
      error: error.message
    });
  }
});

// POST /api/automatic-triggers/run-now - Manually trigger one execution
router.post('/run-now', verifyAdminOrManager, async (req, res) => {
  try {
    console.log(`${req.user.name} (${req.user.role}) manually triggered automatic check`);
    await AutomaticTriggerService.executeAutomaticCheck();
    res.json({
      success: true,
      message: 'Automatic check executed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to execute automatic check',
      error: error.message
    });
  }
});

module.exports = router;