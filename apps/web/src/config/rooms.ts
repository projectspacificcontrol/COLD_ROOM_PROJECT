export const roomGroups = [
  { groupCode: "CR123", roomNumbers: [1, 2, 3] },
  { groupCode: "CR456", roomNumbers: [4, 5, 6] },
  { groupCode: "CR789", roomNumbers: [7, 8, 9] },
  { groupCode: "CR101112", roomNumbers: [10, 11, 12] },
  { groupCode: "CR131415", roomNumbers: [13, 14, 15] },
  { groupCode: "CR161718", roomNumbers: [16, 17, 18] }
] as const;

export const expectedSensorTags = roomGroups.flatMap((group) =>
  group.roomNumbers.flatMap((roomNumber, roomIndex) =>
    Array.from({ length: 5 }, (_, sensorIndex) => {
      const ttIndex = roomIndex * 5 + sensorIndex + 1;
      return {
        groupCode: group.groupCode,
        roomNumber,
        sourceTag: `${group.groupCode}_TT${ttIndex.toString().padStart(2, "0")}`,
        label: `T${sensorIndex + 1}`
      };
    })
  )
);

