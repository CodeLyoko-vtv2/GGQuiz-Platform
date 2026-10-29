import { useUserSettings } from "../../context/UserSettingsContext";

function WallpaperLayer() {
  const { background } = useUserSettings();
  if (!background || background.type === "none") return null;

  if (background.type === "youtube" && background.videoId) {
    const src = `https://www.youtube.com/embed/${background.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${background.videoId}&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`;
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">
        <iframe
          title="Live wallpaper"
          src={src}
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
      </div>
    );
  }

  if (background.type === "image" && background.url) {
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${background.url})` }}
      >
        <div className="absolute inset-0 bg-slate-950/35" />
      </div>
    );
  }

  return null;
}

export default WallpaperLayer;
