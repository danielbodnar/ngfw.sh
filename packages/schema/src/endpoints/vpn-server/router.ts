import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { VpnServerConfigRead } from "./configRead";
import { VpnServerConfigUpdate } from "./configUpdate";
import { VpnServerPeerList } from "./peerList";
import { VpnServerPeerCreate } from "./peerCreate";
import { VpnServerPeerDelete } from "./peerDelete";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const vpnServerRouter = fromHono(app);

vpnServerRouter.get("/config", VpnServerConfigRead);
vpnServerRouter.put("/config", VpnServerConfigUpdate);
vpnServerRouter.get("/peers", VpnServerPeerList);
vpnServerRouter.post("/peers", VpnServerPeerCreate);
vpnServerRouter.delete("/peers/:id", VpnServerPeerDelete);
