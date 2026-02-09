import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { IpsAlertList } from "./alertList";
import { IpsCategoryList } from "./categoryList";
import { IpsCategoryUpdate } from "./categoryUpdate";
import { IpsConfigRead } from "./configRead";
import { IpsConfigUpdate } from "./configUpdate";
import { IpsRuleCreate } from "./ruleCreate";
import { IpsRuleDelete } from "./ruleDelete";
import { IpsRuleList } from "./ruleList";

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
