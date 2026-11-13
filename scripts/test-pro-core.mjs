import assert from "node:assert/strict";
import { buildAssignment, parseParticipantNames } from "../pro-core.js";

assert.deepEqual(
  parseParticipantNames("Anna\nBen;Chris, Dana\nanna"),
  ["Anna", "Ben", "Chris", "Dana"]
);

const alphabetical = buildAssignment(
  ["Dana", "Anna", "Chris", "Ben"],
  ["Raum 1", "Raum 2"],
  "alphabetical"
);
assert.deepEqual(
  alphabetical.groups.map((group) => group.members.map((member) => member.name)),
  [["Anna", "Chris"], ["Ben", "Dana"]]
);

const balanced = buildAssignment(
  ["A", "B", "C", "D", "E"],
  ["R1", "R2"],
  "balanced",
  0,
  () => 0.5
);
assert.equal(balanced.groups[0].members.length, 3);
assert.equal(balanced.groups[1].members.length, 2);

const rotation = buildAssignment(
  ["A", "B", "C", "D"],
  ["R1", "R2"],
  "rotation",
  0,
  () => 0.999
);
assert.equal(rotation.nextRotationIndex, 1);
assert.equal(rotation.groups.flatMap((group) => group.members).length, 4);

assert.throws(() => buildAssignment([], ["R1"], "balanced"));
assert.throws(() => buildAssignment(["A"], [], "balanced"));

console.log("Pro core tests passed.");
