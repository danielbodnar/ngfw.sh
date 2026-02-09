import { D1ListEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { PlanModel } from "./base";

export class PlanList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: PlanModel,
	};

	searchFields = ["name", "description"];
	defaultOrderBy = "sort_order ASC";
}
