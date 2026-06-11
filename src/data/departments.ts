import { Department } from "../types/models";
import { mockUsers } from "../mock/users";

// Helper to get admin IDs by department name
const adminIdsFor = (deptName: string): string[] =>
  mockUsers
    .filter((u) => u.departmentId)
    .filter((u) => {
      const dep = departments.find((d) => d.id === u.departmentId);
      return dep?.name === deptName;
    })
    .map((u) => u.id);

export const departments: Department[] = [
  {
    id: "d1",
    name: "Sales",
    adminIds: adminIdsFor("Sales"), // ["u8"]
  },
  {
    id: "d2",
    name: "HR",
    adminIds: adminIdsFor("HR"), // ["u11"]
  },
  {
    id: "d3",
    name: "Production",
    adminIds: adminIdsFor("Production"), // ["u9"]
  },
  {
    id: "d4",
    name: "Marketing",
    adminIds: adminIdsFor("Marketing"), // ["u10"]
  },
];
