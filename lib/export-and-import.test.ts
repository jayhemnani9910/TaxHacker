import { describe, expect, it, vi } from "vitest"

// Another user already has a "Coworking" category and a "Side Gig" project
const { prismaMock } = vi.hoisted(() => {
  type Row = { userId: string; code: string; name: string }
  type Where = { userId?: string; OR: { code?: string; name?: string }[] }
  const findFirst =
    (table: Row[]) =>
    async ({ where }: { where: Where }) =>
      table.find(
        (row) =>
          (where.userId === undefined || row.userId === where.userId) &&
          where.OR.some((match) => row.code === match.code || row.name === match.name)
      ) ?? null
  return {
    prismaMock: {
      category: { findFirst: findFirst([{ userId: "other", code: "coworking", name: "Coworking" }]) },
      project: { findFirst: findFirst([{ userId: "other", code: "side_gig", name: "Side Gig" }]) },
    },
  }
})

vi.mock("@/lib/db", () => ({ prisma: prismaMock }))
vi.mock("@/models/categories", () => ({
  createCategory: vi.fn(async (userId: string, data: { code: string; name: string }) => ({ userId, ...data })),
  getCategoryByCode: vi.fn(),
}))
vi.mock("@/models/projects", () => ({
  createProject: vi.fn(async (userId: string, data: { code: string; name: string }) => ({ userId, ...data })),
  getProjectByCode: vi.fn(),
}))

import { createCategory } from "@/models/categories"
import { EXPORT_AND_IMPORT_FIELD_MAP } from "@/models/export_and_import"
import { createProject } from "@/models/projects"

describe("CSV import of amounts", () => {
  it("converts to whole cents without losing one to float error", async () => {
    expect(await EXPORT_AND_IMPORT_FIELD_MAP.total.import!("user", "4.35")).toBe(435)
    expect(await EXPORT_AND_IMPORT_FIELD_MAP.convertedTotal.import!("user", "9.95")).toBe(995)
  })
})

describe("CSV import of categories and projects", () => {
  it("creates them for the importing user when only another user has them", async () => {
    expect(await EXPORT_AND_IMPORT_FIELD_MAP.categoryCode.import!("user", "Coworking")).toBe("coworking")
    expect(await EXPORT_AND_IMPORT_FIELD_MAP.projectCode.import!("user", "Side Gig")).toBe("side_gig")

    expect(createCategory).toHaveBeenCalledWith("user", { code: "coworking", name: "Coworking" })
    expect(createProject).toHaveBeenCalledWith("user", { code: "side_gig", name: "Side Gig" })
  })
})
