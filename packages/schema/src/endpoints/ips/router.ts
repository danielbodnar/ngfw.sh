import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { IpsConfigRead } from "./configRead";
import { IpsConfigUpdate } from "./configUpdate";
import { IpsCategoryList } from "./categoryList";
import { IpsCategoryUpdate } from "./categoryUpdate";
import { IpsRuleList } from "./ruleList";
import { IpsRuleCreate } from "./ruleCreate";
import { IpsRuleDelete } from "./ruleDelete";
import { IpsAlertList } from "./alertList";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const ipsRouter = fromHono(app);

ipsRouter.get("/config", IpsConfigRead);
ipsRouter.put("/config", IpsConfigUpdate);
ipsRouter.get("/categories", IpsCategoryList);
ipsRouter.put("/categories/:id", IpsCategoryUpdate);
ipsRouter.get("/rules", IpsRuleList);
ipsRouter.post("/rules", IpsRuleCreate);
ipsRouter.delete("/rules/:id", IpsRuleDelete);
ipsRouter.get("/alerts", IpsAlertList);
