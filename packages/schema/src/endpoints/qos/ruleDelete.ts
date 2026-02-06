import { D1DeleteEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { QosRuleModel } from "./base";

export class QosRuleDelete extends D1DeleteEndpoint<HandleArgs> {
	_meta = {
		model: QosRuleModel,
	};
}
