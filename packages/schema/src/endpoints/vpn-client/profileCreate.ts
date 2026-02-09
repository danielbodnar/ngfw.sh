import { D1CreateEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { VpnClientProfileModel, vpnClientProfileCreate } from "./base";

export class ProfileCreate extends D1CreateEndpoint<HandleArgs> {
	_meta = {
		model: VpnClientProfileModel,
		fields: vpnClientProfileCreate,
	};
}
