import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { WifiRadiosRead } from "./radiosRead";
import { WifiRadiosUpdate } from "./radiosUpdate";
import { WifiNetworksRead } from "./networksRead";
import { WifiNetworksUpdate } from "./networksUpdate";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const wifiRouter = fromHono(app);

wifiRouter.get("/radios", WifiRadiosRead);
wifiRouter.put("/radios", WifiRadiosUpdate);
wifiRouter.get("/networks", WifiNetworksRead);
wifiRouter.put("/networks", WifiNetworksUpdate);
