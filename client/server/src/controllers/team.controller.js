const teamService = require('../services/team.service');
const ApiResponse  = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.createTeam = asyncHandler(async (req, res) => {
  const team = await teamService.createTeam(req.tenantId, req.user._id, req.body);
  ApiResponse.created(res, team, 'Team created');
});

exports.listTeams = asyncHandler(async (req, res) => {
  const teams = await teamService.getUserTeams(req.tenantId, req.user._id);
  ApiResponse.ok(res, teams);
});

exports.getTeam = asyncHandler(async (req, res) => {
  const team = await teamService.getTeam(req.params.id, req.tenantId, req.user._id);
  ApiResponse.ok(res, team);
});

exports.updateTeam = asyncHandler(async (req, res) => {
  const team = await teamService.updateTeam(req.params.id, req.tenantId, req.user._id, req.body);
  ApiResponse.ok(res, team, 'Team updated');
});

exports.deleteTeam = asyncHandler(async (req, res) => {
  await teamService.deleteTeam(req.params.id, req.tenantId, req.user._id);
  ApiResponse.noContent(res);
});

exports.inviteMember = asyncHandler(async (req, res) => {
  const team = await teamService.inviteMember(req.params.id, req.tenantId, req.user._id, req.body.userId, req.body.role);
  ApiResponse.ok(res, team, 'Member invited');
});

exports.removeMember = asyncHandler(async (req, res) => {
  const team = await teamService.removeMember(req.params.id, req.tenantId, req.user._id, req.params.userId);
  ApiResponse.ok(res, team, 'Member removed');
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  const team = await teamService.updateMemberRole(req.params.id, req.tenantId, req.user._id, req.params.userId, req.body.role);
  ApiResponse.ok(res, team, 'Role updated');
});
