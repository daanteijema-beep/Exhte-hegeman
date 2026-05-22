import { Nav } from "@/components/brandos/Nav";

export default function BrandosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-6 py-10">{children}</main>
    </>
  );
}
