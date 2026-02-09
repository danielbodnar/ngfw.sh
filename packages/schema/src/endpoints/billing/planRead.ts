import { D1ReadEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { PlanModel } from "./base";

export class PlanRead extends D1ReadEndpoint<HandleArgs> {
	_meta = {
		model: PlanModel,
	};
}
