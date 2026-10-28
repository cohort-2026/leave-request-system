export const NOT_IN_COMPANY = "You are not in a company";

type JsonRes = {
  status: (code: number) => { json: (body: unknown) => void };
};

export function sameCompanyId(
  left: number | null | undefined,
  right: number | null | undefined,
): boolean {
  return (
    typeof left === "number" &&
    typeof right === "number" &&
    Number.isInteger(left) &&
    Number.isInteger(right) &&
    left > 0 &&
    left === right
  );
}

export function companyIdOf(
  user: { company_id?: number | null } | null | undefined,
): number | null {
  const id = user?.company_id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export function requireCompanyId(
  user: { company_id?: number | null } | null | undefined,
  res: JsonRes,
): number | null {
  const id = companyIdOf(user);
  if (id === null) {
    res.status(403).json({ error: NOT_IN_COMPANY });
    return null;
  }
  return id;
}
