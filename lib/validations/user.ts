// C:\JetSetNew6\lib\validations\user.ts

import * as z from "zod"

// Validation for updating user role
export const userRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
})

// Validation for updating user name
export const userNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
})
