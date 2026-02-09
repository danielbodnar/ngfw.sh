import { D1UpdateEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { VpnClientProfileModel, vpnClientProfileUpdate } from "./base";

export class ProfileUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: VpnClientProfileModel,
		fields: vpnClientProfileUpdate,
	};
}
