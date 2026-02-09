import { D1ListEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { VpnClientProfileModel } from "./base";

export class ProfileList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: VpnClientProfileModel,
	};

	searchFields = ["name"];
	defaultOrderBy = "created_at DESC";
}
