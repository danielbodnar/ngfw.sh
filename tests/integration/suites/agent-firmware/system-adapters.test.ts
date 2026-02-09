/**
 * Integration tests for Agent<->Firmware system adapters
 * Tests interaction with router system binaries and interfaces
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { createMockFirmwareAdapter } from "../../framework";

import type { MockFirmwareAdapter } from "../../framework/mocks/firmware-adapter";

describe("Agent<->Firmware System Adapters Integration", () => {
	let firmware: MockFirmwareAdapter;

	beforeEach(() => {
		firmware = createMockFirmwareAdapter({ verbose: false });
	});

	describe("NVRAM Adapter", () => {
		it("should read router model from NVRAM", () => {
			const result = firmware.executeCommand("nvram get model");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("RT-AX86U");
			expect(result.stderr).toBe("");
		});

		it("should read firmware version from NVRAM", () => {
			const result = firmware.executeCommand("nvram get firmver");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("388.1_0");
		});

		it("should set NVRAM values", () => {
			firmware.executeCommand("nvram set test_key=test_value");

			const result = firmware.executeCommand("nvram get test_key");
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("test_value");
		});

		it("should handle missing NVRAM keys", () => {
			const result = firmware.executeCommand("nvram get nonexistent_key");

			expect(result.exitCode).toBe(1);
			expect(result.stdout).toBe("");
		});

		it("should unset NVRAM values", () => {
			firmware.executeCommand("nvram set temp_key=temp_value");
			firmware.executeCommand("nvram unset temp_key");

			const result = firmware.executeCommand("nvram get temp_key");
			expect(result.exitCode).toBe(1);
		});

		it("should read LAN IP configuration", () => {
			const result = firmware.executeCommand("nvram get lan_ipaddr");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("192.168.1.1");
		});

		it("should read wireless SSID configuration", () => {
			const result5g = firmware.executeCommand("nvram get wl0_ssid");
			expect(result5g.stdout).toBe("ASUS_5G");

			const result2g = firmware.executeCommand("nvram get wl1_ssid");
			expect(result2g.stdout).toBe("ASUS_2G");
		});
	});

	describe("IPTables Adapter", () => {
		it("should add firewall rules", () => {
			const result = firmware.executeCommand(
				"iptables -A INPUT -p tcp --dport 22 -j ACCEPT",
			);

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");

			const rules = firmware.iptables.listRules("INPUT");
			expect(rules).toContain("-p tcp --dport 22 -j ACCEPT");
		});

		it("should list firewall rules", () => {
			firmware.iptables.addRule("INPUT", "-p tcp --dport 80 -j ACCEPT");
			firmware.iptables.addRule("INPUT", "-p tcp --dport 443 -j ACCEPT");

			const result = firmware.executeCommand("iptables -L INPUT");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("80");
			expect(result.stdout).toContain("443");
		});

		it("should delete firewall rules", () => {
			firmware.iptables.addRule("INPUT", "-p tcp --dport 8080 -j ACCEPT");
			firmware.iptables.addRule("INPUT", "-p tcp --dport 8443 -j ACCEPT");

			firmware.executeCommand("iptables -D INPUT 1");

			const rules = firmware.iptables.listRules("INPUT");
			expect(rules.length).toBe(1);
			expect(rules[0]).toContain("8443");
		});

		it("should flush all rules", () => {
			firmware.iptables.addRule("INPUT", "-p tcp --dport 80 -j ACCEPT");
			firmware.iptables.addRule("OUTPUT", "-p tcp --dport 443 -j ACCEPT");

			firmware.executeCommand("iptables -F");

			expect(firmware.iptables.listRules()).toHaveLength(0);
		});

		it("should handle multiple chains", () => {
			firmware.iptables.addRule("INPUT", "rule1");
			firmware.iptables.addRule("OUTPUT", "rule2");
			firmware.iptables.addRule("FORWARD", "rule3");

			const inputRules = firmware.iptables.listRules("INPUT");
			const outputRules = firmware.iptables.listRules("OUTPUT");
			const forwardRules = firmware.iptables.listRules("FORWARD");

			expect(inputRules).toHaveLength(1);
			expect(outputRules).toHaveLength(1);
			expect(forwardRules).toHaveLength(1);
		});
	});

	describe("Dnsmasq Adapter", () => {
		it("should start dnsmasq service", () => {
			const result = firmware.executeCommand("service dnsmasq start");

			expect(result.exitCode).toBe(0);
			expect(firmware.dnsmasq.isRunning()).toBe(true);
		});

		it("should stop dnsmasq service", () => {
			firmware.dnsmasq.start();
			firmware.executeCommand("service dnsmasq stop");

			expect(firmware.dnsmasq.isRunning()).toBe(false);
		});

		it("should restart dnsmasq service", () => {
			firmware.dnsmasq.start();
			const result = firmware.executeCommand("service dnsmasq restart");

			expect(result.exitCode).toBe(0);
			expect(firmware.dnsmasq.isRunning()).toBe(true);
		});

		it("should manage DHCP leases", () => {
			firmware.dnsmasq.addLease(
				"00:11:22:33:44:55",
				"192.168.1.100",
				"client1",
				Date.now() + 3600000,
			);
			firmware.dnsmasq.addLease(
				"00:11:22:33:44:56",
				"192.168.1.101",
				"client2",
				Date.now() + 3600000,
			);

			const leases = firmware.dnsmasq.getLeases();
			expect(leases).toHaveLength(2);
			expect(leases[0].hostname).toBe("client1");
			expect(leases[1].hostname).toBe("client2");
		});

		it("should clear DHCP leases", () => {
			firmware.dnsmasq.addLease(
				"00:11:22:33:44:55",
				"192.168.1.100",
				"client1",
				Date.now() + 3600000,
			);
			firmware.dnsmasq.clearLeases();

			expect(firmware.dnsmasq.getLeases()).toHaveLength(0);
		});
	});

	describe("Network Interface Adapter", () => {
		it("should list network interfaces", () => {
			const result = firmware.executeCommand("ip addr show");

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("eth0");
			expect(result.stdout).toContain("br0");
		});

		it("should read interface MAC addresses", () => {
			const result = firmware.executeCommand("ip addr show");

			expect(result.stdout).toContain("00:11:22:33:44:55"); // eth0 MAC
			expect(result.stdout).toContain("00:11:22:33:44:56"); // br0 MAC
		});

		it("should show interface IP addresses", () => {
			const result = firmware.executeCommand("ip addr show");

			expect(result.stdout).toContain("192.168.1.1"); // br0 IP
		});

		it("should track interface statistics", () => {
			const eth0 = firmware.getNetworkInterface("eth0");
			expect(eth0).toBeDefined();
			expect(eth0?.rxBytes).toBeGreaterThanOrEqual(0);
			expect(eth0?.txBytes).toBeGreaterThanOrEqual(0);
		});

		it("should manage interface state", () => {
			const eth0 = firmware.getNetworkInterface("eth0");
			expect(eth0?.up).toBe(true);

			const br0 = firmware.getNetworkInterface("br0");
			expect(br0?.up).toBe(true);
		});
	});

	describe("Wireless Adapter", () => {
		it("should configure wireless interfaces", () => {
			firmware.wireless.setInterface("wl0", {
				ssid: "Test_5G",
				enabled: true,
				channel: 36,
				security: "wpa3",
			});

			const iface = firmware.wireless.getInterface("wl0");
			expect(iface).toBeDefined();
			expect(iface?.ssid).toBe("Test_5G");
			expect(iface?.channel).toBe(36);
		});

		it("should track wireless clients", () => {
			firmware.wireless.setInterface("wl0", {
				ssid: "Test_5G",
				enabled: true,
				channel: 36,
				security: "wpa3",
			});

			firmware.wireless.addClient("wl0", "00:11:22:33:44:AA", -45);
			firmware.wireless.addClient("wl0", "00:11:22:33:44:BB", -52);

			const clients = firmware.wireless.getClients("wl0");
			expect(clients).toHaveLength(2);
			expect(clients[0].rssi).toBe(-45);
			expect(clients[1].rssi).toBe(-52);
		});

		it("should support multiple wireless interfaces", () => {
			firmware.wireless.setInterface("wl0", {
				ssid: "Test_5G",
				enabled: true,
				channel: 36,
				security: "wpa3",
			});

			firmware.wireless.setInterface("wl1", {
				ssid: "Test_2G",
				enabled: true,
				channel: 6,
				security: "wpa2",
			});

			const wl0 = firmware.wireless.getInterface("wl0");
			const wl1 = firmware.wireless.getInterface("wl1");

			expect(wl0?.ssid).toBe("Test_5G");
			expect(wl1?.ssid).toBe("Test_2G");
		});
	});

	describe("System Information", () => {
		it("should read system hostname", () => {
			const hostname = firmware.system.getHostname();
			expect(hostname).toBe("RT-AX86U");
		});

		it("should read system uptime", () => {
			firmware.system.setUptime(86400);
			expect(firmware.system.getUptime()).toBe(86400);
		});

		it("should read load averages", () => {
			const load = firmware.system.getLoadAvg();
			expect(load).toHaveLength(3);
			expect(load[0]).toBeGreaterThanOrEqual(0);
		});

		it("should read CPU usage", () => {
			const cpu = firmware.system.getCpuUsage();
			expect(cpu).toBeGreaterThanOrEqual(0);
			expect(cpu).toBeLessThanOrEqual(100);
		});

		it("should read memory information", () => {
			const memory = firmware.system.getMemory();
			expect(memory.total).toBeGreaterThan(0);
			expect(memory.free).toBeGreaterThanOrEqual(0);
			expect(memory.used).toBeGreaterThanOrEqual(0);
			expect(memory.total).toBe(memory.free + memory.used);
		});

		it("should read system temperature", () => {
			const temp = firmware.system.getTemperature();
			expect(temp).toBeGreaterThan(0);
			expect(temp).toBeLessThan(150); // Reasonable upper bound
		});
	});

	describe("Command History Tracking", () => {
		it("should track all executed commands", () => {
			firmware.executeCommand("nvram get model");
			firmware.executeCommand("iptables -L");
			firmware.executeCommand("service dnsmasq start");

			const history = firmware.getCommandHistory();
			expect(history).toHaveLength(3);
			expect(history[0].command).toBe("nvram get model");
			expect(history[1].command).toBe("iptables -L");
			expect(history[2].command).toBe("service dnsmasq start");
		});

		it("should include timestamps in command history", () => {
			const before = Date.now();
			firmware.executeCommand("nvram get firmver");
			const after = Date.now();

			const history = firmware.getCommandHistory();
			const timestamp = history[0].timestamp.getTime();

			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it("should clear command history", () => {
			firmware.executeCommand("nvram get model");
			firmware.executeCommand("nvram get firmver");

			firmware.clearCommandHistory();

			expect(firmware.getCommandHistory()).toHaveLength(0);
		});
	});

	describe("State Reset", () => {
		it("should reset all adapter state", () => {
			// Modify various state
			firmware.nvram.set("test", "value");
			firmware.iptables.addRule("INPUT", "test-rule");
			firmware.dnsmasq.start();
			firmware.executeCommand("test command");

			firmware.reset();

			// Verify state is reset
			expect(firmware.nvram.get("test")).toBeNull();
			expect(firmware.iptables.listRules()).toHaveLength(0);
			expect(firmware.dnsmasq.isRunning()).toBe(false);
			expect(firmware.getCommandHistory()).toHaveLength(0);

			// Verify default state is restored
			expect(firmware.nvram.get("model")).toBe("RT-AX86U");
		});
	});
});
