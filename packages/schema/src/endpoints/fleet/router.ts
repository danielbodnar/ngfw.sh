import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { DeviceDelete } from "./deviceDelete";
import { DeviceList } from "./deviceList";
import { DeviceRegister } from "./deviceRegister";
import { DeviceStatus } from "./deviceStatus";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const fleetRouter = fromHono(app);

fleetRouter.get("/devices", DeviceList);
fleetRouter.post("/devices", DeviceRegister);
fleetRouter.delete("/devices/:id", DeviceDelete);
fleetRouter.get("/devices/:id/status", DeviceStatus);
