// Landing page has its own minimal layout without sidebar/header
// The parent layout handles the Clerk provider

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
