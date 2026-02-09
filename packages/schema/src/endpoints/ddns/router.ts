import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { DdnsConfigRead } from "./configRead";
import { DdnsConfigUpdate } from "./configUpdate";
import { DdnsForceUpdate } from "./forceUpdate";
import { DdnsProviderList } from "./providerList";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const ddnsRouter = fromHono(app);

ddnsRouter.get("/providers", DdnsProviderList);
ddnsRouter.get("/config/:deviceId", DdnsConfigRead);
ddnsRouter.put("/config/:deviceId", DdnsConfigUpdate);
ddnsRouter.post("/update/:deviceId", DdnsForceUpdate);
