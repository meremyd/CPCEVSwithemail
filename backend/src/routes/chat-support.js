const express = require("express")
const chatSupportController = require("../controllers/chatSupportController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Public routes - MUST come first
router.post("/", chatSupportController.submitRequest)
router.get("/faqs", chatSupportController.getFAQs) // Public FAQ endpoint
router.get("/faqs/categories", chatSupportController.getFAQCategories) // Public categories endpoint

// Admin routes - MUST come before generic routes to avoid conflicts
// Statistics and export routes should come first
router.get("/stats/summary", authMiddleware, authorizeRoles("admin"), chatSupportController.getStatistics)
router.get("/export", authMiddleware, authorizeRoles("admin"), chatSupportController.exportRequests)
router.post("/bulk-update", authMiddleware, authorizeRoles("admin"), chatSupportController.bulkUpdateStatus)

// Generic admin routes - these should come AFTER specific routes
router.get("/", authMiddleware, authorizeRoles("admin"), chatSupportController.getAllRequests)
router.get("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.getRequest)
router.put("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.updateRequestStatus)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.deleteRequest)

module.exports = router