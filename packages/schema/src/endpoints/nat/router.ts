import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { NatRuleList } from "./natRuleList";
import { NatRuleCreate } from "./natRuleCreate";
import { NatRuleUpdate } from "./natRuleUpdate";
import { NatRuleDelete } from "./natRuleDelete";
import { UpnpList } from "./upnpList";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const natRouter = fromHono(app);

natRouter.get("/rules", NatRuleList);
natRouter.post("/rules", NatRuleCreate);
natRouter.put("/rules/:id", NatRuleUpdate);
natRouter.delete("/rules/:id", NatRuleDelete);
natRouter.get("/upnp", UpnpList);
