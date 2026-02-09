/**
 * Mock firmware adapter for testing agent<->firmware integration
 * Simulates router system binaries and interfaces
 * @module mocks/firmware-adapter
 */

export interface FirmwareAdapterConfig {
	verbose?: boolean;
	/** Paths to mock binaries */
	mockBinPaths?: Record<string, string>;
	/** Mock /proc and /sys filesystem */
	mockSysFS?: boolean;
}

/**
 * Mock result from command execution
 */
export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Mock network interface
 */
export interface MockNetworkInterface {
	name: string;
	type: "wan" | "lan" | "wifi";
	ip?: string;
	netmask?: string;
	mac: string;
	up: boolean;
	rxBytes: number;
	txBytes: number;
}

/**
 * Mock NVRAM storage
 */
export class MockNVRAM {
	private storage = new Map<string, string>();

	get(key: string): string | null {
		return this.storage.get(key) ?? null;
	}

	set(key: string, value: string): void {
		this.storage.set(key, value);
	}

	unset(key: string): void {
		this.storage.delete(key);
	}

	getAll(): Record<string, string> {
		return Object.fromEntries(this.storage);
	}

	clear(): void {
		this.storage.clear();
	}

	commit(): void {
		// Mock commit - no-op
	}
}

/**
 * Mock iptables rules
 */
export class MockIptables {
	private chains = new Map<string, string[]>();

	constructor() {
		// Initialize default chains
		this.chains.set("INPUT", []);
		this.chains.set("OUTPUT", []);
		this.chains.set("FORWARD", []);
		this.chains.set("PREROUTING", []);
		this.chains.set("POSTROUTING", []);
	}

	addRule(chain: string, rule: string): void {
		if (!this.chains.has(chain)) {
			this.chains.set(chain, []);
		}
		this.chains.get(chain)!.push(rule);
	}

	deleteRule(chain: string, ruleNum: number): void {
		const rules = this.chains.get(chain);
		if (rules && ruleNum > 0 && ruleNum <= rules.length) {
			rules.splice(ruleNum - 1, 1);
		}
	}

	listRules(chain?: string): string[] {
		if (chain) {
			return this.chains.get(chain) ?? [];
		}
		return Array.from(this.chains.values()).flat();
	}

	flush(chain?: string): void {
		if (chain) {
			this.chains.set(chain, []);
		} else {
			for (const key of this.chains.keys()) {
				this.chains.set(key, []);
			}
		}
	}

	clear(): void {
		this.chains.clear();
	}
}

/**
 * Mock dnsmasq service
 */
export class MockDnsmasq {
	private running = false;
	private config = new Map<string, string>();
	private leases = new Map<
		string,
		{ ip: string; mac: string; hostname: string; expires: number }
	>();

	start(): void {
		this.running = true;
	}

	stop(): void {
		this.running = false;
	}

	restart(): void {
		this.stop();
		this.start();
	}

	isRunning(): boolean {
		return this.running;
	}

	setConfig(key: string, value: string): void {
		this.config.set(key, value);
	}

	getConfig(key: string): string | null {
		return this.config.get(key) ?? null;
	}

	addLease(mac: string, ip: string, hostname: string, expires: number): void {
		this.leases.set(mac, { ip, mac, hostname, expires });
	}

	getLeases(): Array<{
		ip: string;
		mac: string;
		hostname: string;
		expires: number;
	}> {
		return Array.from(this.leases.values());
	}

	clearLeases(): void {
		this.leases.clear();
	}
}

/**
 * Mock wireless interface
 */
export class MockWireless {
	private interfaces = new Map<
		string,
		{
			ssid: string;
			enabled: boolean;
			channel: number;
			security: string;
			clients: Array<{ mac: string; rssi: number }>;
		}
	>();

	setInterface(
		name: string,
		config: {
			ssid: string;
			enabled: boolean;
			channel: number;
			security: string;
		},
	): void {
		this.interfaces.set(name, { ...config, clients: [] });
	}

	getInterface(name: string) {
		return this.interfaces.get(name);
	}

	addClient(ifname: string, mac: string, rssi: number): void {
		const iface = this.interfaces.get(ifname);
		if (iface) {
			iface.clients.push({ mac, rssi });
		}
	}

	getClients(ifname: string): Array<{ mac: string; rssi: number }> {
		return this.interfaces.get(ifname)?.clients ?? [];
	}

	clear(): void {
		this.interfaces.clear();
	}
}

/**
 * Mock system utilities
 */
export class MockSystem {
	private hostname = "RT-AX86U";
	private uptime = 0;
	private loadAvg: [number, number, number] = [0.5, 0.8, 1.0];
	private cpuUsage = 25.0;
	private memTotal = 1024 * 1024; // 1GB
	private memFree = 512 * 1024; // 512MB
	private temperature = 65;

	getHostname(): string {
		return this.hostname;
	}

	setHostname(name: string): void {
		this.hostname = name;
	}

	getUptime(): number {
		return this.uptime;
	}

	setUptime(seconds: number): void {
		this.uptime = seconds;
	}

	getLoadAvg(): [number, number, number] {
		return this.loadAvg;
	}

	setLoadAvg(load: [number, number, number]): void {
		this.loadAvg = load;
	}

	getCpuUsage(): number {
		return this.cpuUsage;
	}

	setCpuUsage(usage: number): void {
		this.cpuUsage = usage;
	}

	getMemory(): { total: number; free: number; used: number } {
		return {
			total: this.memTotal,
			free: this.memFree,
			used: this.memTotal - this.memFree,
		};
	}

	setMemory(total: number, free: number): void {
		this.memTotal = total;
		this.memFree = free;
	}

	getTemperature(): number {
		return this.temperature;
	}

	setTemperature(temp: number): void {
		this.temperature = temp;
	}
}

/**
 * Main firmware adapter mock
 */
export class MockFirmwareAdapter {
	public nvram: MockNVRAM;
	public iptables: MockIptables;
	public dnsmasq: MockDnsmasq;
	public wireless: MockWireless;
	public system: MockSystem;

	private config: FirmwareAdapterConfig;
	private networkInterfaces = new Map<string, MockNetworkInterface>();
	private commandHistory: Array<{
		command: string;
		result: CommandResult;
		timestamp: Date;
	}> = [];

	constructor(config: FirmwareAdapterConfig = {}) {
		this.config = {
			verbose: false,
			mockSysFS: true,
			...config,
		};

		this.nvram = new MockNVRAM();
		this.iptables = new MockIptables();
		this.dnsmasq = new MockDnsmasq();
		this.wireless = new MockWireless();
		this.system = new MockSystem();

		this.initializeDefaultState();
	}

	/**
	 * Execute a mock command
	 */
	executeCommand(command: string): CommandResult {
		const parts = command.split(" ");
		const binary = parts[0];
		const args = parts.slice(1);

		let result: CommandResult = {
			stdout: "",
			stderr: "",
			exitCode: 0,
		};

		try {
			switch (binary) {
				case "nvram":
					result = this.handleNvramCommand(args);
					break;
				case "iptables":
					result = this.handleIptablesCommand(args);
					break;
				case "service":
					result = this.handleServiceCommand(args);
					break;
				case "wl":
					result = this.handleWirelessCommand(args);
					break;
				case "ip":
					result = this.handleIpCommand(args);
					break;
				default:
					result = {
						stdout: "",
						stderr: `${binary}: command not found`,
						exitCode: 127,
					};
			}
		} catch (err) {
			result = {
				stdout: "",
				stderr: err instanceof Error ? err.message : String(err),
				exitCode: 1,
			};
		}

		this.commandHistory.push({
			command,
			result,
			timestamp: new Date(),
		});

		if (this.config.verbose) {
			console.log(`[Firmware] Executed: ${command}`);
			if (result.stdout) console.log(`  stdout: ${result.stdout}`);
			if (result.stderr) console.error(`  stderr: ${result.stderr}`);
		}

		return result;
	}

	/**
	 * Get command execution history
	 */
	getCommandHistory(): Array<{
		command: string;
		result: CommandResult;
		timestamp: Date;
	}> {
		return [...this.commandHistory];
	}

	/**
	 * Clear command history
	 */
	clearCommandHistory(): void {
		this.commandHistory = [];
	}

	/**
	 * Add a network interface
	 */
	addNetworkInterface(iface: MockNetworkInterface): void {
		this.networkInterfaces.set(iface.name, iface);
	}

	/**
	 * Get network interface
	 */
	getNetworkInterface(name: string): MockNetworkInterface | undefined {
		return this.networkInterfaces.get(name);
	}

	/**
	 * List all network interfaces
	 */
	listNetworkInterfaces(): MockNetworkInterface[] {
		return Array.from(this.networkInterfaces.values());
	}

	/**
	 * Reset all state
	 */
	reset(): void {
		this.nvram.clear();
		this.iptables.clear();
		this.dnsmasq.clearLeases();
		this.wireless.clear();
		this.networkInterfaces.clear();
		this.commandHistory = [];
		this.initializeDefaultState();
	}

	/**
	 * Initialize default router state
	 */
	private initializeDefaultState(): void {
		// Default NVRAM settings
		this.nvram.set("model", "RT-AX86U");
		this.nvram.set("firmver", "388.1_0");
		this.nvram.set("lan_ipaddr", "192.168.1.1");
		this.nvram.set("lan_netmask", "255.255.255.0");
		this.nvram.set("wl0_ssid", "ASUS_5G");
		this.nvram.set("wl1_ssid", "ASUS_2G");

		// Default network interfaces
		this.addNetworkInterface({
			name: "eth0",
			type: "wan",
			mac: "00:11:22:33:44:55",
			up: true,
			rxBytes: 0,
			txBytes: 0,
		});

		this.addNetworkInterface({
			name: "br0",
			type: "lan",
			ip: "192.168.1.1",
			netmask: "255.255.255.0",
			mac: "00:11:22:33:44:56",
			up: true,
			rxBytes: 0,
			txBytes: 0,
		});
	}

	/**
	 * Handle nvram commands
	 */
	private handleNvramCommand(args: string[]): CommandResult {
		const action = args[0];

		if (action === "get") {
			const value = this.nvram.get(args[1]);
			return {
				stdout: value ?? "",
				stderr: "",
				exitCode: value ? 0 : 1,
			};
		}

		if (action === "set") {
			const [key, value] = args[1].split("=");
			this.nvram.set(key, value);
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		if (action === "unset") {
			this.nvram.unset(args[1]);
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		if (action === "commit") {
			this.nvram.commit();
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		return {
			stdout: "",
			stderr: `Unknown nvram action: ${action}`,
			exitCode: 1,
		};
	}

	/**
	 * Handle iptables commands
	 */
	private handleIptablesCommand(args: string[]): CommandResult {
		const action = args[0];

		if (action === "-A" || action === "--append") {
			const chain = args[1];
			const rule = args.slice(2).join(" ");
			this.iptables.addRule(chain, rule);
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		if (action === "-L" || action === "--list") {
			const chain = args[1];
			const rules = this.iptables.listRules(chain);
			return {
				stdout: rules.join("\n"),
				stderr: "",
				exitCode: 0,
			};
		}

		if (action === "-F" || action === "--flush") {
			const chain = args[1];
			this.iptables.flush(chain);
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		return {
			stdout: "",
			stderr: `Unknown iptables action: ${action}`,
			exitCode: 1,
		};
	}

	/**
	 * Handle service commands
	 */
	private handleServiceCommand(args: string[]): CommandResult {
		const service = args[0];
		const action = args[1];

		if (service === "dnsmasq") {
			if (action === "start") this.dnsmasq.start();
			if (action === "stop") this.dnsmasq.stop();
			if (action === "restart") this.dnsmasq.restart();
			return { stdout: "", stderr: "", exitCode: 0 };
		}

		return {
			stdout: "",
			stderr: `Unknown service: ${service}`,
			exitCode: 1,
		};
	}

	/**
	 * Handle wireless commands
	 */
	private handleWirelessCommand(_args: string[]): CommandResult {
		return {
			stdout: "wl mock output",
			stderr: "",
			exitCode: 0,
		};
	}

	/**
	 * Handle ip commands
	 */
	private handleIpCommand(args: string[]): CommandResult {
		if (args[0] === "addr" && args[1] === "show") {
			const interfaces = Array.from(this.networkInterfaces.values());
			const output = interfaces
				.map((iface) => {
					return `${iface.name}: <${iface.up ? "UP" : "DOWN"}> mtu 1500
    link/ether ${iface.mac}
    ${iface.ip ? `inet ${iface.ip}/${iface.netmask}` : ""}`;
				})
				.join("\n");

			return { stdout: output, stderr: "", exitCode: 0 };
		}

		return { stdout: "", stderr: "", exitCode: 0 };
	}
}

/**
 * Create a mock firmware adapter instance
 */
export function createMockFirmwareAdapter(
	config?: FirmwareAdapterConfig,
): MockFirmwareAdapter {
	return new MockFirmwareAdapter(config);
}
