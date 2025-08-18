import { describe, expect, it } from "vitest";
import { MockTable } from "../fixtures/mock-table.js";

describe("MockTable", () => {
	it("should have correct table name", () => {
		expect(MockTable.tableName).toBe("mock-table");
	});
	it("should have GSI by alias", () => {
		expect(MockTable.getGsiByAlias("byWorkspace")).toBeDefined();
	});
});
