import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}): Promise<Metadata> {
  const { deviceId } = await params;

  return {
    manifest: `/field/${deviceId}/manifest.json`,
  };
}

export default function FieldDeviceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
