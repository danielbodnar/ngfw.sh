import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { ReportDelete } from "./reportDelete";
import { ReportGenerate } from "./reportGenerate";
import { ReportList } from "./reportList";
import { ReportRead } from "./reportRead";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const reportsRouter = fromHono(app);

reportsRouter.get("/", ReportList);
reportsRouter.post("/generate", ReportGenerate);
reportsRouter.get("/:id", ReportRead);
reportsRouter.delete("/:id", ReportDelete);
