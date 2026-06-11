import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gatewayRouter from "./gateway";
import providersRouter from "./providers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gatewayRouter);
router.use(providersRouter);

export default router;
