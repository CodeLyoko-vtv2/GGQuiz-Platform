function AvatarMark({ user, size = "md", className = "" }) {
  const initial = (user?.name || "U").trim().charAt(0).toUpperCase();
  const box = size === "lg" ? "h-16 w-16 text-2xl" : size === "xl" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-sm";
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || "Avatar"}
        className={`${box} rounded-full object-cover ring-2 ring-white/70 ${className}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex ${box} items-center justify-center rounded-full bg-purple-600 font-bold text-white ${className}`}
    >
      {initial}
    </span>
  );
}

export default AvatarMark;
