/** The one avatar renderer every surface that shows a person's name
 * should use -- a real photo (people.avatar_url) when one exists,
 * else the same initials circle (people.avatar_initials) everything
 * already fell back to. Plain <img>, not next/image or the shadcn
 * Avatar primitive: this needs to work identically in Server and
 * Client Components, at whatever tiny size a table row/comment/member
 * card calls for, with zero extra config. Before this existed, several
 * surfaces (task comments, project members, the owner picker) each
 * grew their own initials-only circle independently -- this replaces
 * all of them so a real photo actually reaches everywhere a name does. */
export function PersonAvatar({
  avatarUrl,
  initials,
  size = 20,
  className = "",
}: {
  avatarUrl?: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(8, size * 0.42) };
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- shared avatar used in both Server and Client Components, at sizes too small for next/image to matter
    return <img src={avatarUrl} alt="" style={style} className={`rounded-full object-cover flex-none ${className}`} />;
  }
  return (
    <span
      style={style}
      className={`rounded-full bg-ink-soft text-white flex items-center justify-center flex-none leading-none font-semibold ${className}`}
    >
      {initials}
    </span>
  );
}
