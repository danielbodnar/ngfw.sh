import { fromHono } from "chanfana";
import { Hono } from "hono";
import { OnboardingOrderCreate } from "./orderCreate";
import { OnboardingRouterList } from "./routerList";
import { OnboardingStatusRead } from "./statusRead";

export const onboardingRouter = fromHono(new Hono());

onboardingRouter.get("/routers", OnboardingRouterList);
onboardingRouter.post("/order", OnboardingOrderCreate);
onboardingRouter.get("/status", OnboardingStatusRead);
