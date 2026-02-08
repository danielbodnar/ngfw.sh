import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { DhcpConfigRead } from "./configRead";
import { DhcpConfigUpdate } from "./configUpdate";
import { DhcpLeasesList } from "./leasesList";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const dhcpRouter = fromHono(app);

dhcpRouter.get("/config", DhcpConfigRead);
dhcpRouter.put("/config", DhcpConfigUpdate);
dhcpRouter.get("/leases", DhcpLeasesList);
