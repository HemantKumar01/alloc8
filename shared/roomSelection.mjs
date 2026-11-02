// The seed stores the block in roomId (KalamB-401-btech23), not in hostel.
export function buildHostelOptions(hostels = {}) {
  return Object.fromEntries(
    Object.entries(hostels).sort(([a], [b]) => a.localeCompare(b)).flatMap(([hostel, blocks]) =>
      Object.entries(blocks).sort(([a], [b]) => a.localeCompare(b)).map(([block, ranges]) => [
        `${hostel} ${block}`,
        {
          hostel,
          block,
          floors: [...new Set(ranges.map(range => range.split("-")[0][0]))]
            .sort((a, b) => Number(a) - Number(b)),
        },
      ]),
    ),
  );
}

export function buildRoomFilter(allocation, { batch, gender, hostel, block, floor }) {
  const options = buildHostelOptions(allocation[batch]?.[gender]?.hostels);
  const selection = Object.values(options).find(option =>
    option.hostel === hostel && option.block === block && option.floors.includes(floor),
  );
  if (!selection) return null;

  return {
    batch,
    gender,
    hostel: selection.hostel,
    floor,
    roomId: { startsWith: `${selection.hostel}${selection.block}-` },
  };
}
