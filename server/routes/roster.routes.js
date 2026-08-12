import express from "express";

import {
  createRoster,
  getRoster,
  getRosterById,
  updateRoster,
  deleteRoster,
} from "../controllers/roster.controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";

const router = express.Router();


// POST /api/rosters
router.post("/", verifyJWT, createRoster);

// GET /api/rosters
router.get("/", verifyJWT, getRoster);

// GET /api/rosters/:id
router.get("/:id", verifyJWT, getRosterById);

// PUT /api/rosters/:id
router.put("/:id", verifyJWT, updateRoster);

// DELETE /api/rosters/:id
router.delete("/:id", verifyJWT, deleteRoster);


export default router;