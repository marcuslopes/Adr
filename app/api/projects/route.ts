import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/madr";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  backend: z.enum(["DATABASE", "FILE"]).default("DATABASE"),
  filePath: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { adrs: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, backend, filePath } = parsed.data;
  const slug = slugify(name);

  // Ensure unique slug
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A project with this name already exists" }, { status: 409 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      description,
      backend,
      filePath,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
