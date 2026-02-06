import { D1UpdateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { QosRuleModel } from "./base";

export class QosRuleUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: QosRuleModel,
		fields: QosRuleModel.schema.pick({
			name: true,
			source_ip: true,
			protocol: true,
			priority: true,
			bandwidth_limit: true,
			enabled: true,
		}),
	};
}
