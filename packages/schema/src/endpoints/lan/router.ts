import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { LanConfigRead } from "./configRead";
import { LanConfigUpdate } from "./configUpdate";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const lanRouter = fromHono(app);

lanRouter.get("/config", LanConfigRead);
lanRouter.put("/config", LanConfigUpdate);
