import { D1CreateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { QosRuleModel } from "./base";

export class QosRuleCreate extends D1CreateEndpoint<HandleArgs> {
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
