import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { DashboardList } from "./dashboardList";
import { DashboardRead } from "./dashboardRead";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const dashboardsRouter = fromHono(app);

dashboardsRouter.get("/", DashboardList);
dashboardsRouter.get("/:id", DashboardRead);
