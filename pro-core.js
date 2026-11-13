export function parseParticipantNames(value) {
  return String(value || "")
    .split(/\r?\n|;/)
    .flatMap((line) => {
      const cells = line.split(",").map((cell) => cell.trim()).filter(Boolean);
      return cells.length > 1 ? cells : [line.trim()];
    })
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase()) === index);
}

export function shuffle(items, random = Math.random) {
  const copyItems = [...items];
  for (let index = copyItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copyItems[index], copyItems[randomIndex]] = [copyItems[randomIndex], copyItems[index]];
  }
  return copyItems;
}

export function buildAssignment(names, roomNames, mode, rotationIndex = 0, random = Math.random) {
  if (roomNames.length === 0) throw new Error("Lege mindestens einen Raum an.");
  if (names.length === 0) throw new Error("Fuege mindestens eine teilnehmende Person ein.");

  let ordered = [...names];
  let nextRotationIndex = rotationIndex;
  if (mode === "alphabetical") {
    ordered.sort((a, b) => a.localeCompare(b, "de"));
  } else {
    ordered = shuffle(ordered, random);
  }

  if (mode === "rotation" && ordered.length > 1) {
    nextRotationIndex = (Number(rotationIndex) + 1) % ordered.length;
    ordered = ordered.slice(nextRotationIndex).concat(ordered.slice(0, nextRotationIndex));
  }

  const groups = roomNames.map((roomName) => ({ roomName, members: [] }));
  ordered.forEach((name, index) => {
    groups[index % groups.length].members.push({ name });
  });

  return { groups, nextRotationIndex };
}
