import { describe, expect, it } from "vitest";
import { readCsvRecords, writeCsv } from "../csv";

describe("csv", () => {
  it("reads quoted commas, line breaks and doubled quotes, skipping empty lines", () => {
    // Arrange
    const text = '﻿id,note\r\n1,"a, ""b""\r\nc"\r\n\r\n2,plain\r\n';

    // Act
    const records = readCsvRecords(text);

    // Assert
    expect(records).toEqual([
      ["id", "note"],
      ["1", 'a, "b"\r\nc'],
      ["2", "plain"],
    ]);
  });

  it("ends a record at a lone \\r and keeps a line of commas as a row", () => {
    // Act
    const records = readCsvRecords("id,city\r1,A\r,\r\r2,B");

    // Assert
    expect(records).toEqual([
      ["id", "city"],
      ["1", "A"],
      ["", ""],
      ["2", "B"],
    ]);
  });

  it("writes what it reads back, quoting only where needed", () => {
    // Arrange
    const rows = [
      ["email", "link"],
      ["ana@example.com", "https://hub.test/share/1/a/x"],
      [' Zoë "Z" ', "a,b"],
    ];

    // Act
    const text = writeCsv(rows);

    // Assert
    expect(text.startsWith("﻿email,link\r\n")).toBe(true);
    expect(text).toContain('" Zoë ""Z"" ","a,b"');
    expect(readCsvRecords(text)).toEqual(rows);
  });
});
