"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/guard-actions";
import { prisma } from "@/lib/prisma";

export type UserActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const roleSchema = z.enum(["ADMIN", "EDITOR"]);

const createSchema = z.object({
  email: z.string().email("Неверный email."),
  name: z.string().min(1, "Имя обязательно."),
  role: roleSchema,
  password: z.string().min(6, "Минимум 6 символов."),
});

const updateSchema = z.object({
  email: z.string().email("Неверный email."),
  name: z.string().min(1, "Имя обязательно."),
  role: roleSchema,
  password: z.string().optional(),
});

function parse(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "EDITOR"),
    password: String(formData.get("password") ?? "").trim() || undefined,
  };
}

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await assertAdmin();
  const parsed = createSchema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { ok: false, message: "Пользователь с таким email уже существует.", fieldErrors: { email: ["Email занят."] } };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
  });

  redirect("/admin/users");
}

export async function updateUserAction(
  id: string,
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await assertAdmin();

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, message: "Пользователь не найден." };

  const parsed = updateSchema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const emailOwner = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id: existing.id } },
    select: { id: true },
  });
  if (emailOwner) return { ok: false, message: "Email занят другим пользователем.", fieldErrors: { email: ["Email занят."] } };

  const data: {
    email: string;
    name: string;
    role: "ADMIN" | "EDITOR";
    passwordHash?: string;
  } = {
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  };

  if (parsed.data.password && parsed.data.password.length >= 6) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await prisma.user.update({ where: { id: existing.id }, data });
  redirect(`/admin/users/${existing.id}/edit`);
}

export async function deleteUserAction(id: string) {
  await assertAdmin();
  await prisma.user.delete({ where: { id } });
  redirect("/admin/users");
}
