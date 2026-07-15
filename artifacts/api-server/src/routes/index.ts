import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import jobsRouter from "./jobs.js";
import applicationsRouter from "./applications.js";
import candidatesRouter from "./candidates.js";
import interviewsRouter from "./interviews.js";
import notificationsRouter from "./notifications.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/jobs", jobsRouter);
router.use("/applications", applicationsRouter);
router.use("/candidates", candidatesRouter);
router.use("/interviews", interviewsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);

export default router;
