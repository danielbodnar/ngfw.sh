import { D1ListEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { QosRuleModel } from "./base";

export class QosRuleList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: QosRuleModel,
	};
	searchFields = ["name", "source_ip", "protocol"];
	defaultOrderBy = "priority ASC, created_at DESC";
}
