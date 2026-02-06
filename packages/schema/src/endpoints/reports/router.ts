import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { ReportList } from "./reportList";
import { ReportGenerate } from "./reportGenerate";
import { ReportRead } from "./reportRead";
import { ReportDelete } from "./reportDelete";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const reportsRouter = fromHono(app);

reportsRouter.get("/", ReportList);
reportsRouter.post("/generate", ReportGenerate);
reportsRouter.get("/:id", ReportRead);
reportsRouter.delete("/:id", ReportDelete);
