import { Hono } from "hono";
import { fromHono } from "chanfana";
import { PlanList } from "./planList";
import { PlanRead } from "./planRead";

export const billingRouter = fromHono(new Hono());

billingRouter.get("/plans", PlanList);
billingRouter.get("/plans/:id", PlanRead);
