import fs from "fs";
import path from "path";
import { ManualContent } from "./ManualContent";

export const metadata = {
  title: "Manual de Usuario - Cancha Llena",
};

export default function ManualPage() {
  const filePath = path.join(process.cwd(), "docs", "manual-usuario.md");
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="mx-auto max-w-4xl">
      <ManualContent content={content} />
    </div>
  );
}
