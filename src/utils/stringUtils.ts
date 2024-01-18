export function extractJSON(inputString: string) {
  const regex = /{[^]*?}/;
  const match = inputString.match(regex);
  if (match) {
    const json = JSON.parse(match[0]);
    return json;
  }
  throw new Error("JSON not found.");
}
