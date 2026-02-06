import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { QosConfigRead } from "./configRead";
import { QosConfigUpdate } from "./configUpdate";
import { QosRuleList } from "./ruleList";
import { QosRuleCreate } from "./ruleCreate";
import { QosRuleUpdate } from "./ruleUpdate";
import { QosRuleDelete } from "./ruleDelete";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const qosRouter = fromHono(app);

qosRouter.get("/config", QosConfigRead);
qosRouter.put("/config", QosConfigUpdate);
qosRouter.get("/rules", QosRuleList);
qosRouter.post("/rules", QosRuleCreate);
qosRouter.put("/rules/:id", QosRuleUpdate);
qosRouter.delete("/rules/:id", QosRuleDelete);
