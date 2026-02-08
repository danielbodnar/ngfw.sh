import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { WanConfigRead } from "./configRead";
import { WanConfigUpdate } from "./configUpdate";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const wanRouter = fromHono(app);

wanRouter.get("/config", WanConfigRead);
wanRouter.put("/config", WanConfigUpdate);
