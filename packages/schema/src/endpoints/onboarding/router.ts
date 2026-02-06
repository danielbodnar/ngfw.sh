import { Hono } from "hono";
import { fromHono } from "chanfana";
import { OnboardingRouterList } from "./routerList";
import { OnboardingOrderCreate } from "./orderCreate";
import { OnboardingStatusRead } from "./statusRead";

export const onboardingRouter = fromHono(new Hono());

onboardingRouter.get("/routers", OnboardingRouterList);
onboardingRouter.post("/order", OnboardingOrderCreate);
onboardingRouter.get("/status", OnboardingStatusRead);
