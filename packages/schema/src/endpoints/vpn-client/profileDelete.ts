import { D1DeleteEndpoint } from "chanfana";
import type { HandleArgs } from "../../types";
import { VpnClientProfileModel } from "./base";

export class ProfileDelete extends D1DeleteEndpoint<HandleArgs> {
	_meta = {
		model: VpnClientProfileModel,
	};
}
