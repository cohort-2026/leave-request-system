import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  documentIsRequired,
  documentThresholdForType,
  isDocumentDeferredFlag,
} from "./supportingFile.js";

describe("documentIsRequired", () => {
  it("requires a document at the configured working-day threshold", () => {
    assert.equal(documentIsRequired(2, 2), true);
  });

  it("requires a document when the duration exceeds the threshold", () => {
    assert.equal(documentIsRequired(2, 3), true);
  });

  it("does not require a document below the threshold", () => {
    assert.equal(documentIsRequired(2, 1), false);
  });

  it("requires a document immediately when the threshold is zero", () => {
    assert.equal(documentIsRequired(0, 1), true);
  });
});

describe("documentThresholdForType", () => {
  it("uses the company medical rule for Sick", () => {
    assert.equal(documentThresholdForType("Sick", 9, 2), 2);
  });

  it("keeps the leave-type threshold for other types", () => {
    assert.equal(documentThresholdForType("Study", 0, 2), 0);
  });
});

describe("isDocumentDeferredFlag", () => {
  it("accepts multipart true flags", () => {
    assert.equal(isDocumentDeferredFlag("true"), true);
    assert.equal(isDocumentDeferredFlag("false"), false);
  });
});
